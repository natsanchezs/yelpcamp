var express = require("express");
var router  = express.Router();
var passport = require("passport");
var Campground = require("../models/campground");
var User = require("../models/user");
var Notification = require("../models/notification");
var middleware = require("../middleware");
var async = require("async");
var multer = require("multer");
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require("cloudinary");
cloudinary.config({ 
  cloud_name: "learningtocode", 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

//INDEX - show all campgrounds
router.get("/", function(req, res){
		var noMatch = null;
	if(req.query.search){
		const regex = new RegExp(escapeRegex(req.query.search), "gi");
		Campground.find({name: regex}, function(err, allCampgrounds){
		if(err){
			console.log(err);
		} else {
			if(allCampgrounds.length < 1){
				noMatch = "No campgrounds match that query, please try again";
			} 
			res.render("campgrounds/index", {campgrounds:allCampgrounds, page: "campgrounds", noMatch: noMatch});
		}
	});	
	} else { 
	//Get all campgrounds from DB
	Campground.find({}, function(err, allCampgrounds){
		if(err){
			console.log(err);
		} else {
			res.render("campgrounds/index", {campgrounds:allCampgrounds, page: "campgrounds", noMatch: noMatch});
		}
	});	
	}
});
	
		
//CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, upload.single("image"), function(req, res) {
    cloudinary.v2.uploader.upload(req.file.path, async function(err, result) {
      if(err) {
        req.flash("error", err.message);
        return res.redirect("back");
      }
	 // add cloudinary url for the image to the campground object under image property
      req.body.campground.image = result.secure_url;
      // add image's public_id to campground object
      req.body.campground.imageId = result.public_id;
      // add author to campground
      req.body.campground.author = {
        id: req.user._id,
        username: req.user.username
      }
      // Campground.create(req.body.campground, function(err, campground)
      // add cloudinary url for the image to the campground object under image property
		// var image =  req.body.campground.image = result.secure_url;
		// // add image's public_id to campground object
		// var imageId = req.body.campground.imageId = result.public_id;
		// // add author to campground
		// var author= req.body.campground.author = {
		// id: req.user._id,
		// username: req.user.username
		// };
		// var desc = req.body.campground.description;
	  
		// var newCampground= {image: image, imageId: imageId, description: desc, author: author}
		// // Campground.create(req.body.campground)
		
		try {
			let campground = await Campground.create(req.body.campground);
			let user = await User.findById(req.user._id).populate("followers").exec();
			let newNotificacion = {
				username: req.user.username,
				campgroundId: campground.id
			}
			for(const follower of user.followers) {
				let notification = await Notification.create(newNotificacion);
				follower.notifications.push(notification);
				follower.save();
			}
			//redirect back to campgrounds page
			res.redirect("/campgrounds/" + campground.id);
		} catch(err) {
			req.flash("error", err.message);
			res.redirect("back");
		}
	});
		  
});



//NEW ROUTE - show form to create new campground
router.get("/new", middleware.isLoggedIn, function(req, res){
	res.render("campgrounds/new");
});

//SHOW - show more info about one campground
router.get("/:id", function(req, res){
	//find the campground with provided provided
Campground.findById(req.params.id).populate("comments").exec(function(err, foundCampground){
		if(err || !foundCampground){
			req.flash("error", "Campground not found");
			res.redirect("back");
		} else {
			res.render("campgrounds/show", {campground: foundCampground});
		}
	});
});

//EDIT CAMPGROUND ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
		Campground.findById(req.params.id, function(err, foundCampground){
			res.render("campgrounds/edit", {campground: foundCampground});
		});
});

//UPDATE CAMPGROUND ROUTE
router.put("/:id", upload.single("image"), middleware.checkCampgroundOwnership,  function(req, res){	
	//find and update correct campground
	Campground.findById(req.params.id, async  function(err, campground){
		if(err){
			req.flash("error", err.message);
			res.redirect("back");
		} else {
			if(req.file) {
				try {
								await cloudinary.v2.uploader.destroy(campground.imageId);		
					var result = await cloudinary.v2.uploader.upload(req.file.path);
					campground.imageId = result.public_id;
		campground.image = result.secure_url;
					
				} catch(err){
					req.flash("error", err.message);
					return res.redirect("back");
				}
	}
	campground.name = req.body.campground.name;
	campground.description = req.body.campground.description;

	campground.save();
	req.flash("success", "Successfully Updated!");
	res.redirect("/campgrounds/" + campground._id);
		}
	});
});

//DESTROY CAMPGROUND ROUTE
router.delete("/:id", middleware.checkCampgroundOwnership, function(req, res){
	Campground.findById(req.params.id, async function(err, campground){
		if(err){
			req.flash("error", err.message);
			return res.redirect("back");
		} 
		try {
			await cloudinary.v2.uploader.destroy(campground.imageId);
			campground.remove();
			req.flash("success", "Campground deleted successfully!")
			res.redirect("/campgrounds");
		} catch(err) {
			if(err) {
				req.flash("error", err.message);
				return res.redirect("back");
			}		
	}
	});
});
	
	function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};


module.exports = router;