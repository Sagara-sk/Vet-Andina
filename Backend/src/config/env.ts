
import joi from 'joi';
import dotenv from "dotenv";
import { resolve } from "node:path";

dotenv.config({ path: resolve(__dirname, "../../.env") });

const envsSchema = joi
    .object({
        PORT: joi.number().required(),
        DATABASE_URL: joi.string().required(),
        JWT_SECRET: joi.string().required(),
    })
    .unknown(true);

const { value, error } = envsSchema.validate(process.env);

if (error) throw new Error(error.message);

export const envs = {
    PORT: value.PORT,
    DATABASE_URL: value.DATABASE_URL,
    JWT_SECRET: value.JWT_SECRET,
};
