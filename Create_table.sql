CREATE TABLE A_IMAGE (
    id serial not null primary key,
    name VARCHAR(255) NOT NULL,
    image VARCHAR(199) NOT NULL,
    date TIMESTAMP NOT NULL,
    data bytea NOT NULL
) -- DROP TABLE A_IMAGE