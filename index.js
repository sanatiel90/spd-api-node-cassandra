var express = require('express');
var cassandra = require('cassandra-driver');
var bodyParser = require('body-parser');
var morgan = require('morgan'); 
var jwt = require('jsonwebtoken');
//para criptografar a senha
var crypto = require('crypto');

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


//rota para registrar novo usuário
app.post('/api/register', function(req, res){
    var login = req.body.login;
    var senha = req.body.password;  
    
    try {
      var login = req.body.login;
      var senha = req.body.password;       

      if((!login) || (!senha)){
        res.status(400).json({
            status:"400",    
            mensagem:"informe login e senha para se cadastrar"
        });
    
      } else{
        //criptografia para senha
        var mykey = crypto.createCipher('aes-256-ctr','pass-crypto');        
        var senhaHash = mykey.update(senha,'utf8','hex');
        senhaHash += mykey.final('hex');

        var params = [login,senhaHash];
        var usuario = {login,senhaHash}; 
        var query = "INSERT INTO trab_spd.users(user_login,user_pass) VALUES (?,?)";
        //inserir no banco e retornar 201 se OK   
         client.execute(query,params,{prepare:true},function(err,result){       

            res.status(201).json({
                status:"201",   
                mensagem:"cadastrado com sucesso", 
                login:usuario.login 
            });
         });  

      } 

    } catch (err) {
        res.status(400).json({status:"400",mensagem:"não foi possível criar o usuário"});
    }
});

//realizar login do usuario
app.post('/api/login', function(req, res){
   
    try {
        var login = req.body.login;
        var senha = req.body.password;

        //criptografia para senha
        var mykey = crypto.createCipher('aes-256-ctr','pass-crypto');        
        var senhaHash = mykey.update(senha,'utf8','hex');
        senhaHash += mykey.final('hex'); 
        
        var query = "SELECT * FROM trab_spd.users WHERE user_login = ? LIMIT 1";

        client.execute(query,[login],function(err,result){
            var user = result.rows[0];

            //verficar se senha enviada bate com cadastro
            if(!user){
                res.status(401).json({status:"401",mensagem:"usuário não encontrado"});
            }else if(user.user_login !== login){
                res.status(401).json({status:"401",mensagem:"login do usuário inválido"}); //nao precisa desse if
            } else if(user.user_pass !== senhaHash){
                res.status(401).json({status:"401",mensagem:"senha do usuário inválida"}); 
            }else{
                //se login correto, retorna 200 OK e um token de acesso pra armazenar na aplicação client, 
                //nesse token jwt botar no payload (no atributo data) apenas o login do usuário, q não é um dado sensível                    
                //tempo de expiracao do token: nº segundos 60*60 = 1h
                var tokenJwt = jwt.sign({data:user.user_login},'secretKey',{expiresIn:60*60});   

                res.status(200).json({
                    status:"200",
                    mensagem:"autenticado com sucesso!",
                    usuario:user.user_login,
                    token:tokenJwt
                });
            
            }

        });

             
    } catch (err) {
        res.status(401).json({status:"401",mensagem:"credenciais inválidas"});
    }

});


//middleware para autenticar outras rotas; toda vez q uma requisicao for feita esse middleware será chamado para ver
//se pessoa tem um token valido de acesso; o middleware so vai filtrar as rotas q estao abaixo dele aqui no código
//rotas '/', '/api/register' e '/api/login' não estarão dentro do middle
app.use(function(req,res,next){
    //token vai receber o token de autenticacao enviado pelo cli, esse token pode ser enviado pelo cli
    //de varias formas, como no body da requisicao, na querystring da url ou no header
    var token = req.body.token || req.query.token || req.headers['x-acess-token'];

    if(token){
        //verifica se token está correto
        jwt.verify(token,'secretKey',function(err, decoded){
            if(err){
                return res.json({
                    status:"400",
                    mensagem:"falha ao autenticar token"
                });
            }else{
                //se token estiver OK, a requisicao é válida e o middleware manda para a prox requisicao da lista
                req.decoded = decoded;
                next();
            }
        });


    } else{
        return res.status(403).json({
            status:"403",
            mensagem:"token de acesso não informado"
        });
    }


});

//novo contato
app.post('/api/contacts',function(req,res){
    
       try {
       //recuperando token de acesso(se conseguiu chegar nessa rota, ja passou pelo middleware de autenticacao,
       //entao token existe e está válido)
        var token = req.body.token || req.query.token || req.headers['x-acess-token'];        
        //pegando o payload do token, q conterá o useR_login
        var payload = jwt.verify(token,'secretKey');

        var nomeContato = req.body.nome_contato;
        var telContato = req.body.tel_contato;

        if((!nomeContato)){
            res.status(400).json({
                status:"400",    
                mensagem:"informe o nome do contato"
            });
        
        } else{

             var query = "INSERT INTO trab_spd.contacts(user_login,cont_name,cont_tel) VALUES(?,?,?)";
       
             var params = [payload.data,nomeContato,telContato];
      
             client.execute(query,params,{prepare:true}, function(err, result){
          
                  //fazer verificações de campos vazios
                    res.status(201).json({
                       status:"201",
                       mensagem:"contato criado com sucesso!",
                       usuario:payload.data,
                      contato:nomeContato,
                     telefone:telContato

                  });
    
             });

         }
           
       } catch (error) {
         res.status(400).json({status:"400",mensagem:"não foi possível criar o contato"});
       }
        

});


//retornar contato especifico com base no nome
app.get('/api/contacts/:contact_name', function(req,res){
  
    try {

    var token = req.body.token || req.query.token || req.headers['x-acess-token'];        
    var payload = jwt.verify(token,'secretKey');
    var nomeContato = req.params.contact_name;
    var params = [payload.data,nomeContato];

    var query = "SELECT * FROM trab_spd.contacts WHERE user_login = ? AND cont_name = ?";
   
        client.execute(query,params,function(err, result){
            var contato = result.rows[0];
            
             if(!contato){
                res.status(401).json({status:"400",mensagem:"contato não encontrado"});
             }else{
                res.status(200).json({
                    status:"200",
                    nome_contato: contato.cont_name,
                    tel_contato: contato.cont_tel
                });               
             }

        });    
    } catch (error) {
        res.status(400).json({status:"400",mensagem:"não foi possível encontrar o contato"});
    }   


});

//listar todos contatos do logado
app.get('/api/contacts', function(req,res){
    try {
        
            var token = req.body.token || req.query.token || req.headers['x-acess-token'];        
            var payload = jwt.verify(token,'secretKey');   
            var params = [payload.data];
        
            var query = "SELECT * FROM trab_spd.contacts WHERE user_login = ?";
           
                client.execute(query,params,function(err, result){
                    var contatos = result.rows;
                    
                     if(!contatos){
                        res.status(401).json({status:"400",mensagem:"não existem contatos para este usuário"});
                     }else{
                        res.status(200).json({
                            status:"200",
                            contatos
                        });               
                     }
        
                });    
            } catch (error) {
                res.status(400).json({status:"400",mensagem:"não foi possível encontrar os contatos"});
            }   
});


//apagar contato
app.delete("/api/contacts/:contact_name", function(req, res){
    try {
      
    var token = req.body.token || req.query.token || req.headers['x-acess-token'];        
    var payload = jwt.verify(token,'secretKey');
    var nomeContato = req.params.contact_name;
    var params = [payload.data,nomeContato];

    var query = "DELETE FROM trab_spd.contacts WHERE user_login = ? AND cont_name = ?";
             
    client.execute(query,params,function(err,result){

        if(!nomeContato){
            res.status(401).json({status:"401",mensagem:"contato não encontrado"});
         }else{
            res.status(200).json({
                status: "200",
                mensagem: "contato deletado com sucesso"
            });               
         }      
  
    });
} catch (error) {
    res.status(400).json({status:"400",mensagem:"não foi possível deletar o contato"});
  }

});


//atualizar contato 
//não está funcionando pois no cassandra não se pode mudar um campo PK, 
//nesse caso o nome do contato é uma PK, então nao pode ser modificado, o ideal seria ter um campo ID 
app.put("/api/contacts/:contact_name", function(req, res){
    try {
      
    var token = req.body.token || req.query.token || req.headers['x-acess-token'];        
    var payload = jwt.verify(token,'secretKey');

   var nomeContato = req.params.contact_name;     
   var novoNomeContato = req.body.novo_nome_contato;
   var novoTelContato = req.body.novo_tel_contato;

   if((!nomeContato)){
       res.status(400).json({
           status:"400",    
           mensagem:"informe o nome do contato"
       });
   
   } else{

        var query = "UPDATE trab_spd.contacts SET cont_name = ?, cont_tel = ? WHERE user_login = ? AND cont_name = ?";
        
        var params = [novoNomeContato,novoTelContato,payload.data,nomeContato];
 
        client.execute(query,params,{prepare:true}, function(err, result){
     
             //fazer verificações de campos vazios
               res.status(201).json({
                  status:"201",
                  mensagem:"contato atualizado com sucesso!",
                  usuario:payload.data,
                  contato:novoNomeContato,
                  telefone:novoTelContato

             });

        });

    }
   
    } catch (error) {
        res.status(400).json({status:"400",mensagem:"não foi possível deletar o contato"});
    }

});





app.listen(3000, function(){
    console.log("server running");
});




