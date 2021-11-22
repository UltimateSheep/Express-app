// Files and modules

const axios = require("axios")
const fs = require("fs")
const crypto = require("crypto")
const querystring = require("querystring")

// Persist

async function persist(files) {
    // Fetch data

    let [{ data: saves }, fileData] = await Promise.all([
        axios(`${process.env.REPLIT_DB_URL}?prefix=persist-`),
        Promise.all(files.map(file => new Promise(resolve => {
            fs.access(file, err => {
                if (err) return resolve()
                fs.readFile(file, (err, data) => {
                    resolve(err ? null : {
                        name: file,
                        data: data
                    })
                })
            })
        })))
    ])

    // Update saves

    saves = saves.split("\n")
    fileData = fileData.filter(Boolean)

    await Promise.all(fileData.map(file => new Promise(async (resolve, reject) => {
        // File data

        const data = file.data.toString("base64")
        const hash = crypto.createHash("sha256").update(data).digest("hex")
        file.hash = hash

        if (!saves.includes(`persist-${file.name}`)) {
            // Add file to database

            axios({
                url: process.env.REPLIT_DB_URL,
                method: "POST",
                data: querystring.encode({
                    [`persist-${file.name}`]: hash + data
                })
            }).then(resolve).catch(reject)
        } else {
            // Check state

            const existing = (await axios(`${process.env.REPLIT_DB_URL}/persist-${file.name}`)).data
            const savedHash = existing.slice(0, 64)
            const savedData = existing.slice(64)
        
            if (hash === savedHash) {
                fs.writeFile(file.name, Buffer.from(savedData, "base64"), resolve)
            } else {
                axios({
                    url: process.env.REPLIT_DB_URL,
                    method: "POST",
                    data: querystring.encode({
                        [`persist-${file.name}`]: hash + data
                    })
                }).then(resolve).catch(reject)
            }
        }
    })))

    // Remove old files

    const old = saves.filter(save => !files.includes(save.slice(8)))
    await Promise.all(old.map(file => axios({
        url: `${process.env.REPLIT_DB_URL}/${file}`,
        method: "DELETE"
    })))

    // Save file changes

    const changes = {}
    for (const file of fileData) {
        fs.watch(file.name, () => {
            changes[file.name] = file.hash
        })
    }

    let completed = true
    setInterval(() => {
        if (!completed || !Object.keys(changes).length) return
        completed = false
        const update = {}
        for (const file in changes) {
            const data = fs.readFileSync(file).toString("base64")
            update[`persist-${file}`] = changes[file] + data
            delete changes[file]
        }
        axios({
            url: process.env.REPLIT_DB_URL,
            method: "POST",
            data: querystring.encode(update)
        }).then(() => {
            completed = true
        })
    }, 1000)
}

// Exports

module.exports = persist