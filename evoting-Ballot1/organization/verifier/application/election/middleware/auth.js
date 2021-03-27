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
	if(req.headers.cookie){
		let cookies = req.headers.cookie.split(";");
		let cookie = cookies.filter(cookie => cookie.trim().split("=")[0] == "verifierToken");
		console.log("cookiee", cookie)
		if(cookie && cookie.length > 0){
			let ck = cookie[0].trim().split("=");
			jwtAuth.verify(ck[1].trim(), config.secret, async function (err, decode) {
				if (decode) {
					console.log("decode", decode);
					res.locals.tokenData = decode.sub;
					next();
				} else{
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
	let cookies = req.headers.cookie.split(";");
	let cookie = cookies.filter(cookie => cookie.trim().split("=")[0] == "verifierToken");
	console.log("cookiee", cookie)
	if(cookie && cookie.length > 0){
		return res.redirect("/")
	} else{
		return next();
	}
}
exports.isAdminRoute = (req, res, next)=> {
	console.log("res.locals.tokenData.is_admin", res.locals.tokenData.is_admin)
	if(res.locals.tokenData.is_admin){
		return next();
	} else{
		return res.redirect('/login');
	}
}