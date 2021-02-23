const passport = require('passport');
const { app } = require('../app');
const User = require('../database/models/user.model');
const LocalStrategy = require('passport-local').Strategy;
const googleStrategy = require('passport-google-oauth20').Strategy;
const { findUserPerEmail, findUserPerGoogleId } = require('../queries/user.queries')
const util = require('util');

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id).exec();
        done(null, user);
    }catch (e) {
        done(e, null);
    }
});

passport.use('local',new LocalStrategy({ usernameField: 'email'},async (email, password, done) => {
    try{
        const user = await findUserPerEmail(email);
        if (user){
            const match = await user.comparePassword(password);
            if (match){
                done(null, user);
            }else {
                done(null, false, { message: 'Password doesn\'t match '})
            }
        }else {
            done(null, false, { message: 'User not found' })
        }
    }catch (e) {
        done(e);
    }
}))

passport.use('google', new googleStrategy({
    clientID: '679321079910-5cgul7ra24hecodjo8se0nrt2bs47u64.apps.googleusercontent.com',
    clientSecret: 'secretKey',
    callbackURL: '/auth/google/cb'
}, async (accessToken, refreshToken, profile, done) => {
    console.log(util.inspect(profile, { compact: true, depth: 5, breakLength: 80 }))

    try {
        const user = await findUserPerGoogleId(profile.id)
        if (user) {
            done(null, user);
        } else {
            const newUser = new User({
                username: profile.displayName,
                local: {
                    googleId: profile.id,
                    email: profile.emails[0].value
                }
            })
            const savedUser = await newUser.save();
            done(null, savedUser)
        }
    }catch (e) {
        done(e);
    }
}))