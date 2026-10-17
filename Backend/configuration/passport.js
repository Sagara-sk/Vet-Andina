import { Strategy, ExtractJwt } from 'passport-jwt';
import passport from 'passport';
import { envs } from './envs.js';
import AppDatasource from '../providers/datasource.provider.js';

const repo = AppDatasource.getRepository('User');

const JWT_SECRET = envs.JWT_SECRET;

const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: JWT_SECRET,
};

passport.use(
    new Strategy(opts, async (payload, done) => {
        try {
            const user = await repo.findOne({ where: { id: payload.id } });

            if (!user) {
                return done(null, false);
            }

            return done(null, user);
          } catch (err) {
            return done (err, false);
        }
    })
);

const payload = { id: user.id, username: user.username };

const token = jwt.sign(payload, envs.JWT_SECRET, {
    expiresIn: '1h',
});

res.status(200).json({
    ok: true,
    message: 'Login',
    metadata: { user: { ...user, password: '***'}, token },
    });
;
export default passport;