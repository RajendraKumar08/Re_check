const { validateToken } = require("../service/auth");

function checkForAuthenticationCookie(cookieName){
    return async (req, res, next) => {
        const tokenCookieValue = req.cookies[cookieName];
        if (!tokenCookieValue) {
            return next();
        }
        
        try {
            const userPayload = validateToken(tokenCookieValue);
            req.user = userPayload;
            res.locals.user = userPayload;
        } catch (error) {
            // invalid token: optionally clear cookie or ignore
        }

        return next();
    }
}

module.exports = {checkForAuthenticationCookie}