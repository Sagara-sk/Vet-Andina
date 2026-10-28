import type { Request } from "express";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";
import passport from "passport";
import { findAuthenticatedUserById } from "../models/owner.model";
import { getJwtSecret, SESSION_COOKIE_NAME } from "../services/auth.service";

const extractSessionCookie = (request: Request): string | null =>
  request.cookies?.[SESSION_COOKIE_NAME] ?? null;

passport.use(
  "session-cookie",
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromExtractors([extractSessionCookie]),
      secretOrKey: getJwtSecret(),
      algorithms: ["HS256"],
    },
    async (payload, done) => {
      if (typeof payload.sub !== "string") {
        done(null, false);
        return;
      }

      try {
        const user = await findAuthenticatedUserById(payload.sub);
        done(null, user ?? false);
      } catch (error) {
        done(error as Error, false);
      }
    },
  ),
);

export default passport;