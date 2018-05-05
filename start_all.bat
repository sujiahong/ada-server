cd account_server
call pm2 start app.js --name account_server
cd ..
cd hall_server
call pm2 start app.js --name hall_server
cd ..
cd majiang_server
call pm2 start app.js --name majiang_server
cd ..

pm2 logs