//sudo netstat -tap | grep mysql
const express = require('express'),
    app = express(),
    bodyParser = require('body-parser'),
    morgan = require('morgan'),
    cookieParser = require('cookie-parser'),
    jwt = require('jsonwebtoken'),
    //bcrypt = require('bcrypt'),
    mysql = require('mysql'),
    createError = require('http-errors'),
    helmet = require('helmet'),
    compression = require('compression'),
    sanitizer = require('express-sanitizer');

var saltRounds = 8;

const con = mysql.createConnection({
    host: 'localhost',//process.env.IP,
    //port: process.env.PORT,
    user: 'root',
    password: 'password',
    //socketPath: '/var/run/mysqld/mysqld.sock',
    database: 'MYDB'
});

con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!!");
    con.query('USE MYDB');
});

app.use(morgan('dev'));
app.use(cookieParser());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
//security
app.disable('etag');
app.use(sanitizer());
app.use(helmet());
app.disable('x-powered-by');
app.use(compression());

app.set('superSecret', 'P@ssw0rd');

const tokenCheck = express.Router();

tokenCheck.use((req, res, next)=>{
    if (req.cookies.jsontoken){
        jwt.verify(req.cookies.jsontoken, app.get('superSecret'), (err, decode)=>{
            if (err){
                res.render('index');
                console.log(err);
            }else {
                req.decoded = decode;
                next();
            }
        });
    }else {
        res.status(403).render('index');
    }
});

app.get('/', (req, res)=>{
    res.status(200).render('home');//,{token: req.cookies.jsontoken});
});

app.get('/login', (req, res)=>{
    res.render('home');//,{token: req.cookies.jsontoken});
});

app.post('/login', (req, res)=> {
	console.log(req.body);
    const failsOutput = "<h1 style='color: red;margin: 21% 29%'>Data not available</h1>";
    const userData = {
      id: req.body.id,
      date : req.body.date
    };
    userData.id = (userData.id).toUpperCase();
    if (!(/\d{2}[A-Z]{3}\d{4}/g.test(userData.id))){
        res.send(failsOutput);
    }else{
        con.query("SELECT * FROM STUDENTS WHERE SID='"+userData.id+"' AND DOB='"+userData.date+"'",function(err, result){
            if (err) throw err;
            if (result.length === 0){
                res.send(failsOutput);
            }else {
                const tokens = jwt.sign({sid: userData.id}, app.get('superSecret'), {expiresIn: '12h'});
                res.render('home',{token: tokens});
            }
            console.log(result);
        });
    }
});

function dataSerach(callback){
    con.query("SELECT * FROM MEDICINE_DETAILS WHERE NAME='"+medicineName+"' OR NAME='"+
            dataArray[indexM+3] +"'", (err, result)=>{
            if (err) throw err;
            if (result.length !== 0) res.send({'data':'Here is information that you want '+result[0].DRUGORCHMICAL});
            else  res.send({'data': 'Try something else'});
        }); 
}

app.post('/myQuery', (req,res)=>{
    let userQuery = ((req.sanitize(req.body.query)).toUpperCase());
    const dataArray = userQuery.split(' ');
    let medicineName = '', columnsSel = '';
    if (/DETAIL(|S) OF/g.test(userQuery)){
        //columnsSel = '*';
        medicineName = dataArray[dataArray.indexOf('DETAIL')+2];
        con.query("SELECT * FROM MEDICINE_DETAILS WHERE NAME='"+medicineName+"'", (err, result)=>{
            if (err) throw err;
            if (result) res.send({'data': "Complete information about "+
                    result[0].NAME+
                    "<br>Main drug or chemical use "+(result[0].DRUGORCHMICAL).toLowerCase()+
                    "<br>primary for "+(result[0].TARGET).toLowerCase()+
                    "<br>Side effects "+(result[0].SIDE_EFFECTS).toLowerCase()+
                    "<br>Take "+result[0].USEPERDAY+" in a day"+
                    "<br>For age group "+result[0].AGEGROUP+
                    "<br>You have to "+(result[0].HOWUSE).toLowerCase()});
            else if (!result) res.send({'data': 'Try something else'});
        })
    }else if (/(DRUG|CHEMICAL|AGE|SIDE EFFECT|USE)/g.test(userQuery)){
        columnsSel = /(DRUG|CHEMICAL|AGE|EFFECT|USE|BODY|TARGET)/.exec(userQuery);
        if (columnsSel !== null) columnsSel = columnsSel[0];
        let indexM = dataArray.indexOf(columnsSel),output;
        medicineName = dataArray[dataArray.indexOf(columnsSel)+2];
        con.query("SELECT * FROM MEDICINE_DETAILS WHERE NAME='"+medicineName+"' OR NAME='"+
            dataArray[indexM+3] +"'", (err, result)=> {
            if (err) throw err;
            if (result.length !== 0)
            {
                if (columnsSel === "DRUG" || columnsSel === 'CHEMICAL') output = result[0].DRUGORCHMICAL;
                else if (columnsSel === "EFFECT") output = result[0].SIDE_EFFECTS;
                else if (columnsSel === "AGE") output = result[0].AGEGROUP;
                else if (columnsSel === "TARGET" || columnsSel === "BODY") output = result[0].TARGET;
            }
            if (output) res.send({'data': "Here is information that you want <br>'" + (output).toLowerCase()+"'"});
            else if (!output) res.send({'data': "Once try for complete details"});
        });
    }else if (/(HOW TO USE|HOW TO TAKE)/g.test(userQuery)){
        const findWord = (/(USE|TAKE)/g.exec(userQuery))[0];
        const indexM = (dataArray.indexOf(findWord))+1;
        con.query("SELECT * FROM MEDICINE_DETAILS WHERE NAME='"+dataArray[indexM]+"' OR NAME='"+
            dataArray[indexM+1]+"'", (err,data)=>{
            if (err) throw err;
            if (!data) res.send({'data': "Please try something different"});
            else if (data) res.send({'data': "You have to "+(data[0].HOWUSE).toLowerCase()+" and take  "
                +data[0].USEPERDAY+" per day"});
        });
    }else {
        res.send({'data': 'Please try something else'});
    }
});

app.post('/myquery', tokenCheck, (req,res)=>{
    let queries = (req.body.query).toLowerCase();
    //const venue = ["MB","SJT","TT","SMV","CDMM","GDN"];
    //queries = queries.split(' ');
    let dbResult ;
    if (/event(|s)/g.test(queries)){
        queries = queries.toUpperCase();
        if(queries.search(/(MB|SJT|TT|SMB|CDMM|GDN)/g)>=0){
           let buliding = queries.match(/(MB|SJT|TT|SMB|CDMM|GDN)/g);
           console.log(buliding);
           con.query("SELECT * FROM EVENTS WHERE VENUE='"+buliding+"'", (err, result)=>{
               console.log(result);
               if (result) {
                   dbResult = dbResult + "Here is detail of event NAME"
                       + result[0].NAME + "<br>TYPE" + result[0].TYPE + "<br>DATE" + result[0].HOLDON
                       + "<br>BUILDING" + result[0].VENUE + "<br>ROOM NUMBER" + result[0].ROOMNO
                       + "<br>ORGANIZED BY" + result[0].ORGANIZEDBY;
                   res.send({'data': dbResult});
               }
           })
        }else if (queries.search(/(IAS|GDG|ACM|CSI|ADG|IEEE)/g)>=0) {
            let organizer = queries.match(/(IAS|GDG|ACM|CSI|ADG|IEEE)/g);
            console.log(organizer);
            con.query("SELECT * FROM EVENTS WHERE ORGANIZEBY='"+organizer+"'", (err, result)=>{
                console.log(result);
                if (result) {
                    dbResult = dbResult + "Here is detail of event NAME"
                        + result[0].NAME + "<br>TYPE" + result[0].TYPE + "<br>DATE" + result[0].HOLDON
                        + "<br>BUILDING" + result[0].VENUE + "<br>ROOM NUMBER" + result[0].ROOMNO
                        + "<br>ORGANIZED BY" + result[0].ORGANIZEDBY;
                    res.send({'data': dbResult});
                }
            })
        }/*else if (queries.search(/(\d{1,2}-\d{1,2}-\d{2}|\d{2}-\d{1,2}-\d{1,2})/g)>=0) {
            let dateIs = queries.match(/\d{1,2}-\d{1,2}-\d{2}/g);
            if (dateIs === null){
                dateIs = queries.match(/\d{2}-\d{1,2}-\d{1,2}/g);
            }
            con.query("SELECT * FROM EVENTS WHERE HOLDON='"+dateIs+"'", (err,result)=>{
                console.log(result);
                if (result) {
                    dbResult = dbResult + "Here is detail of event NAME"
                        + result[0].NAME + "<br>TYPE" + result[0].TYPE + "<br>DATE" + result[0].HOLDON
                        + "<br>BUILDING" + result[0].VENUE + "<br>ROOM NUMBER" + result[0].ROOMNO
                        + "<br>ORGANIZED BY" + result[0].ORGANIZEDBY;
                }
            })
        }*/
    }else if (/(my|me)/g.test(queries) && !(/\d{2}[a-z]{3}\d{4}/g.test(queries))) {
        con.query("SELECT * FROM STUDENTS WHERE SID='"+req.decoded.sid+"'", (err, result)=> {
            if (err) console.log(err);
            if (result){
                if (/(fathername|father name)/g.test(queries)) {
                    dbResult = 'Your father name is ' + result[0].FATHERNAME;
                }
                if (/(mothername|mother name)/g.test(queries)) {
                    dbResult = dbResult + "<br>Your mother name is " + result[0].MOTHERNAME;
                }
                if (/(dob|date\Wof\Wbirth)/g.test(queries)) {
                    dbResult = dbResult + "<br>Your DOB is " + result[0].DOB;
                }
                if (/(address|home|city|state)/g.test(queries)) {
                    dbResult = dbResult + "<br>Your address we have " + result[0].CITY + " " + result[0].STATE;
                }
                if (/(email|mailid|id)/g.test(queries)) {
                    dbResult = dbResult + "<br>Your email id is " + result[0].EMAIL;
                }
                if (/(name \w{3,} details|parent(s|) details)/g.test(queries)) {
                    dbResult = dbResult + "<br>Your parents name are " + result[0].FATHERNAME + " " + result[0].MOTHERNAME
                        + " with total income " + result[0].TOTALINCOME;
                }
                if (/(complete|)(details|information|data)/g.test(queries)) {
                    dbResult = dbResult + "<br>Your parents name are " + result[0].FATHERNAME + " " + result[0].MOTHERNAME
                        + "<br>with total income " + result[0].TOTALINCOME + " your email id " + result[0].EMAIL
                        + "<br>your date-of-birth"
                        + result[0].DOB + " your contact no. " + result[0].CONTACTS + "<br>Your address we have "
                        + result[0].CITY + " " + result[0].STATE;
                }
                res.send({'data': dbResult});
            }
        });
    }else{
        res.send({"data" : "We didn't get you please try something different"});
    }
    console.log(dbResult);
});


app.use('*', (req,res)=>{
    res.send("<h1>Error 404<br>Not found</h1>");
});

app.listen(12345, ()=>{
    console.log('Server started\nCode by\nNIKHIL JAIN');
});
