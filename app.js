var express = require("express");
var app = express();
var bodyParser = require("body-parser");

// var request = require("request");
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

var campgrounds = [
		{name: "Salmon Creek", image:"https://image.shutterstock.com/image-photo/young-friends-roasting-marshmallows-over-600w-1351208516.jpg"},
		{name: "Granite Hill" , image:"https://image.shutterstock.com/image-photo/night-summer-camping-on-sea-600w-1163978302.jpg"},
		{name: "Mountain Goat's Rest", image:"https://image.shutterstock.com/image-photo/camping-tent-near-mountain-river-260nw-538634797.jpg"}
	]

app.get("/", function(req, res){
	res.render("landing");
});



app.get("/campgrounds", function(req, res){	
	res.render("campgrounds", {campgrounds:campgrounds});
});

app.post("/campgrounds", function(req, res){
	//get data from form and add to campgrounds array
	var name= req.body.name;
	var image= req.body.image;
	var newCampground = {name: name, image: image}
	campgrounds.push(newCampground);
	//redirect back to campgrounds page
	res.redirect("/campgrounds");
});

app.get("/campgrounds/new", function(req, res){
	res.render("new.ejs");
});

app.listen(3000, function() { 
  console.log("YelpCamp Server Has Started!!"); 
});