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



app.get('/', function(req, res){
    res.json({"mensagem":"Welcome to the API!"});
});


app.post('/register', function(req, res){
    try {
      var userLogin = req.body.login;
      var userPass = req.body.password;
      var params = [userLogin,userPass];
        //inserir no banco e retornar 201 se OK   
    } catch (error) {
        
    }
});

app.post('/login', function(req, res){
//criar index para password no cassa
var userLogin = req.body.login;
var userPass = req.body.password;
var params = [userLogin,userPass]; 

});


app.get("/contato/:nome", function(req,res){
    
    var q = "SELECT * FROM trab_spd.contatos WHERE nome = ?";
   
    client.execute(q,[req.params.nome], function(err, result){
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

//so vai apagar se sql for com a primary key
app.delete("/contato/:num", function(req, res){
    try {
    var q = "DELETE FROM contatos WHERE num = ?"; 
    var n = parseInt(req.params.num);
   
        
     client.execute(q,[parseInt(n)],function(err,result){

     
        res.status(200).send({"mensagem":"deletado com sucesso"});  
  
       
  
    });
} catch (error) {
    res.status(401).send({"msdg":"erro"});
  }

});





app.listen(3000, function(){
    console.log("server running");
});




