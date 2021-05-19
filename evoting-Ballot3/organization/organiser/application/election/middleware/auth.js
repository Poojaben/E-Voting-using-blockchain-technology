const config = require('../config.json');
const jwtAuth = require('jsonwebtoken');
const NodeCouchDb = require('node-couchdb');
const couch = new NodeCouchDb({
	auth:{
		user:'admin',
		password:'adminpw'
	}
});

exports.isAuth = async (req, res, next)=> {
	if(res.locals.tokenData){
		console.log("token data already present")
		return next();
	}else if(req.headers.cookie){
		let cookies = req.headers.cookie.split(";");
		let cookie = cookies.filter(cookie => cookie.trim().split("=")[0] == "token");
		if(cookie && cookie.length > 0){
			console.log("i auth cookie present")
			let ck = cookie[0].trim().split("=");
			jwtAuth.verify(ck[1].trim(), config.secret, async function (err, decode) {
				if (decode) {
					console.log("decode", decode);
					res.locals.tokenData = decode.sub;
					next();
				} else{
					console.log("else login")
					res.clearCookie("token");
					return res.redirect("/login");
				}
			});
		}else{	
			return res.redirect("/login");
		}
	} else{
		return res.redirect("/login");
	}
}
exports.blockIfLoggedIn = (req, res, next)=> {
	if(req.headers.cookie){
		let cookies = req.headers.cookie.split(";");
		let cookie = cookies.filter(cookie => cookie.trim().split("=")[0] == "token");
		console.log("cookiee", cookie)
		if(cookie && cookie.length > 0){
			return res.redirect("/")
		} else{
			return next();
		}
	} else{
		return next();
	}
}
exports.isAdminRoute = (req, res, next)=> {
	console.log("res.locals.tokenData.is_admin", res.locals.tokenData.is_admin)
	if(res.locals.tokenData.is_admin){
		return next();
	} else{
		return res.redirect('/welcome');
	}
}