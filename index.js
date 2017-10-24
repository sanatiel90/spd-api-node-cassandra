var express = require('express');
var cassandra = require('cassandra-driver');
var bodyParser = require('body-parser');

var app = express();

var client = new cassandra.Client({contactPoints:['127.0.0.1'], keyspace:'trab_spd'});

client.connect(function(err, result){
    if(err) throw err;
    console.log("cassandra connected");
});

app.get("/contato", function(req,res){
    
    var q = "SELECT * FROM trab_spd.contatos WHERE num = 4";
    var params = 4;
    
    client.execute(q,[],function(err, result){
        if(err){
            res.status(404).send({"msg":err});
        }

        var user = result.rows[0];

        res.json({"nome":user.nome});

    });

});


app.post("/contato", function(req, res){

    var q = "INSERT INTO trab_spd.contatos(num,nome,tel) VALUES(?,?,?)";

    client.execute(q,[],function(err, result){
        if(err){
            res.status(404).send({"msg":err});
        }

        res.status(201).json({"msg":"criado com sucesso"});

    });

});


app.listen(3000, function(){
    console.log("server running");
});




