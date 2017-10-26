var express = require('express');
var cassandra = require('cassandra-driver');
var bodyParser = require('body-parser');
 

var app = express();

app.use(bodyParser.urlencoded({ extended:true }));

var client = new cassandra.Client({contactPoints:['127.0.0.1'], keyspace:'trab_spd'});

client.connect(function(err, result){
    if(err) throw err;
    console.log("cassandra connected");
});

app.get("/contato", function(req,res){
    
    var q = "SELECT * FROM trab_spd.contatos WHERE nome = ?";
   
    client.execute(q,[req.query.nome], function(err, result){
        if(err){
            res.status(401).send({"msdg":"erro"});
        }

      
        try {
            var user = result.rows[0]; 
            res.json({"nome":user.nome,"tel":user.tel,"num":user.num}); 
        } catch (error) {
            res.status(401).json({"msg":"erro"});
        }       
        
       

    });

   





});


app.post("/contato", function(req, res){

    var q = "INSERT INTO trab_spd.contatos(num,nome,tel) VALUES(?,?,?)";

    var params = [req.body.num,req.body.nome,req.body.tel]; 

    client.execute(q,params,{prepare:true}, function(err, result){
        if(err){
            res.status(404).send({"msg":"erro"});
        }

        res.status(201).json({"msg":"criado com sucesso"});

    });

});


app.listen(3000, function(){
    console.log("server running");
});




