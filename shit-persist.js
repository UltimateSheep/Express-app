// Files and modules

const axios = require("axios")
const fs = require("fs")
const crypto = require("crypto")
const querystring = require("querystring")

// Methods

function persist(files) {
    return new Promise(async resolve => {
        // Initialize file contents

        const init = []
        const save = []

        for (const file of files) {
            fs.access(file, err => {
                if (err) return
                init.push(new Promise(async resolve => {
                    // Fetch data

                    let [data, fileData] = await Promise.all([
                        new Promise(resolve => {
                            axios(`${process.env.REPLIT_DB_URL}/persist-${file}`).then(result => {
                                resolve(result.data)
                            }).catch(() => {
                                resolve(null)
                            })
                        }),
                        new Promise(resolve => {
                            fs.readFile(file, (err, data) => {
                                resolve(err ? null : LZString.compress(data.toString()))
                            })
                        })
                    ])

                    if (!fileData) return
                    const fileHash = crypto.createHash("sha256").update(fileData).digest("hex")

                    if (!data) {
                        // Add file to database

                        try {
                            await axios({
                                url: process.env.REPLIT_DB_URL,
                                method: "POST",
                                data: `persist-${file}=${querystring.encode({
                                    checksum: fileHash,
                                    data: fileData
                                })}`
                            })
                        } catch {
                            return
                        }
                    } else {
                        if (data.checksum === fileHash) {
                            // Update local file

                            await new Promise(resolve => {
                                fs.writeFile(file, LZString.decompress(data.data), resolve)
                            })
                        } else {
                            // Replace file

                            try {
                                await axios({
                                    url: process.env.REPLIT_DB_URL,
                                    method: "POST",
                                    data: `persist-${file}=${querystring.encode({
                                        checksum: fileHash,
                                        data: fileData
                                    })}`
                                })
                            } catch {
                                return
                            }
                        }
                    }

                    // Detect file changes

                    fs.watch(file, () => {
                        for (const pending of save) {
                            if (pending.name === file) return
                        }

                        save.push({
                            name: file,
                            checksum: fileHash
                        })
                    })

                    // Finish

                    resolve()
                }))
            })
        }

        // Remove unused files from database

        const keys = (await axios(`${process.env.REPLIT_DB_URL}?prefix=persist-`)).data.split("\n").filter(key => !files.includes(key.substr(8)))
        for (const key of keys) {
            axios({
                url: `${process.env.REPLIT_DB_URL}/${key}`,
                method: "DELETE"
            }).catch(() => {})
        }

        // Save file changes

        setInterval(async () => {
            if (save.length) {
                const data = {}

                await Promise.all(save.map(file => new Promise(resolve => {
                    fs.readFile(file.name, (err, content) => {
                        if (err) return resolve()
                        data[`persist-${file.name}`] = querystring.encode({
                            checksum: file.checksum,
                            data: LZString.compress(content.toString())
                        })
                        resolve()
                    })
                })))

                axios({
                    url: process.env.REPLIT_DB_URL,
                    method: "POST",
                    data: querystring.encode(data)
                }).catch(() => {})

                save.length = 0   
            }
        }, 5000)

        // Finish

        Promise.all(init).then(resolve).catch(resolve)
    })
}

// Exports

module.exports = persist