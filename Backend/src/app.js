import express from 'express';
import { envs } from './configuration/envs.js';
import userRoute from './module/user/user.route.js';
import passport from './configuration/passport.js';
import { Router } from 'express';
import { userController } from './user.controller.js';
import { createuser } from './schema/user.schema.js';
import { validate } from '../../middlewares/validator.middleware.js';
import { loginuser } from './schema/login.schema.js';

const userRoute = Router();

userRoute.post('/register', validate(createUser), userController.register);
userRoute.post('/login', validate(loginUser), userController.login);
userRoute.get('/users', userController.findAll);

export default userRoute;

const app = express();

app.use(express.json());

app.use(passport.initialize());

app.set('port', envs.PORT);

app.use(userRoute);

const findAll = async (req = request, res = response) => {
    const users = await repo.find();

    console.log(req.user)

    res.status(200).json({ ok: true, message: 'Approved', data: users });
};

export const userController = { register, login, findAll };

export default app;