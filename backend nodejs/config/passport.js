import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/User.js";
import dotenv from "dotenv";

// Đảm bảo env variables được load
dotenv.config();

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: `${process.env.BACKEND_URL}/auth/google/callback`,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Tìm user với Google ID
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // User đã tồn tại
          return done(null, user);
        }

        // Tạo user mới
        user = new User({
          googleId: profile.id,
          username: profile.emails[0].value.split("@")[0].toLowerCase(),
          email: profile.emails[0].value,
          name: profile.displayName,
        });

        await user.save();
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

export default passport;
