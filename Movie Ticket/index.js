let express = require("express");
let app = express();
let mongoose = require("mongoose");
let movieGenre = require("./genre");
let movieShow = require("./movie");
let Fawn = require("fawn");
let user = require("./user");
let Joi = require("@hapi/joi");




app.use(express.json());

mongoose.connect("mongodb://localhost:27017/records",{
    useNewUrlParser: true,
    useUnifiedTopology: true
})
  .then(()=> console.log("Connected to db"))
   .catch((error)=> console.log(`something went wrong  ${error.message}`));

//Using Fawn for security Transaction Purpose
   Fawn.init(mongoose);


// Create Genre
app.post("/genre",async(req,res) =>{
    let {error} = genreValidationError(req.body);
    if(error){
        return res.send(error.details[0].message)
    };
    let genre = new movieGenre.Genre({
        name : req.body.name
    });
    let result =await genre.save();
    res.send(result);

});

//Create Movie
app.post("/movie",async(req,res) =>{
    let {error} = movieValidationError(req.body);
    if(error) {
        return res.send(error.details[0].message)
    };
    let genreDetails = await movieGenre.Genre.findById(req.body.genreId);
    if(!genreDetails){return res.status(403).send({message: "invalid genre id"})};
    let result =  new movieShow.Movie({
        name: req.body.name,
        actor: req.body.actor,
        price: req.body.price,
        stocks: req.body.stocks,
        genre: {
            name: genreDetails.name
        }

    });
    let data = await result.save();
    res.send(data);
});


app.post("/ticketholder",async (req,res)=>
{
    let {error} = userValidationError(req.body);
    if(error) { return res.send(error.details[0].message)};
    let movie = await movieShow.Movie.findById(req.body.movieId);
     if(!movie) {return res.status(403).send({message:"Invalid movie id"})};
     if (movie.stocks ===0 ){return res.status(402).send({message:"out of stock"})};

     let result= new user({
         name : req.body.name,
         movie:{
             name: movie.name,
             price: movie.price,
             stocks: movie.stocks,
             actor: movie.actor

          }
        });
        //If Server Crash then below(commented) method is not beneficial
        // let data = await result.save();
        // movie.stocks--;
        // await movie.save();

        try{
            Fawn.Task()
            .save("ticket_holders",result)
            .update("movies",
               {_id:movie._id},
               {
                   $inc: {
                       stocks: -1,
                   },
               }   
            )
            .run();
            res.send(result);

        }catch(error)
        {
            res.status(500).send({message:"Internal Sever Error",error});
        }
        


       


});


function genreValidationError(error){
    let schema = Joi.object({
        name: Joi.string().min(4).max(100).required()
        });
        return schema.validate(error);
}

function  movieValidationError(error) {
    let schema = Joi.object({
        name: Joi.string().min(4).max(100).required(),
        actor: Joi.string().min(4).max(100).required(),
        price: Joi.number().required(),
        stocks: Joi.number().required(),
        genreId: Joi.string().required()
    });
    return schema.validate(error);
    
}

function  userValidationError(error) {
    let schema = Joi.object({
        name: Joi.string().min(4).max(100).required(),
        movieId: Joi.string().min(4).max(100).required()
    });
    return schema.validate(error);
    
}



app.listen(4800,()=>console.log(`port working on 4800`));