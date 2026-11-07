import joi from 'joi';
import dotenv from "dotenv";
import { resolve } from "node:path";

dotenv.config({ path: resolve(__dirname, "../../.env") });

const envsSchema = joi
    .object({
        PORT: joi.number().required(),
        DATABASE: joi.string().required(),
        DB_USER: joi.string().required(),
        DB_PORT: joi.number().required(),
        DB_PASS: joi.string().allow('').optional(),
        DB_HOST: joi.string().required(),
    })
    .unknown(true);

const { value, error } = envsSchema.validate(process.env);

if (error) throw new Error(error.message);

export const envs = {
    PORT: value.PORT,
    DATABASE: value.DATABASE,
    DB_USER: value.DB_USER,
    DB_PORT: value.DB_PORT,
    DB_PASS: value.DB_PASS,
    DB_HOST: value.DB_HOST,
};