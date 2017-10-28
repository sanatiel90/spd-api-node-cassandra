var express = require('express');
var cassandra = require('cassandra-driver');
var bodyParser = require('body-parser');
var morgan = require('morgan'); 
var jwt = require('jsonwebtoken');

var app = express();


//body-parser para receber req POST e enviar json
app.use(bodyParser.urlencoded({ extended:true }));
app.use(bodyParser.json());

//morgan para ver logs de requisicao
app.use(morgan('dev'));


var client = new cassandra.Client({contactPoints:['127.0.0.1'], keyspace:'trab_spd'});

client.connect(function(err, result){
    if(err) throw err;
    console.log("cassandra connected");
});



app.get('/', function(req, res){
    res.json({"mensagem":"Bem vindo à API!"});
});



app.post('/api/register', function(req, res){
    try {
      var login = req.body.login;
      var senha = req.body.password;
      var params = [login,senha];
      var usuario = {login,senha};

      

      var query = "INSERT INTO trab_spd.users(user_login,user_pass) VALUES (?,?)";
        //inserir no banco e retornar 201 se OK   
      client.execute(query,params,{prepare:true},function(err,result){       

            res.status(201).json({usuario});
      });  

    } catch (err) {
        res.status(400).json({"mensagem":"não foi possível criar o usuário"});
    }
});

//se login correto, retorna 200 OK e um token de acesso pra armazenar no local storage, 
//nesse token jwt botar no payload apenas o login, q 

app.post('/api/login', function(req, res){
//criar index para password no cassa
    var userLogin = req.body.login;
    var userPass = req.body.password;
    var params = [userLogin,userPass]; 

    try {
        
    } catch (error) {
        
    }

});

//pegaR contato especifio
app.get('/api/contacts/:cont_name', function(req,res){
    
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

//listar todos contatos do logado
app.get('/api/contacts/:username', function(req,res){

});


//novo contato
app.post("/api/contacts", function(req, res){

    var q = "INSERT INTO trab_spd.contatos(num,nome,tel) VALUES(?,?,?)";

    var params = [req.body.num,req.body.nome,req.body.tel]; 

    client.execute(q,params,{prepare:true}, function(err, result){
        if(err){
            res.status(404).send({"msg":"erro"});
        }

        res.status(201).json({"msg":"criado com sucesso"});

    });

});

//apagar contato
//so vai apagar se sql for com a primary key
app.delete("/contacts/:cont_name", function(req, res){
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




