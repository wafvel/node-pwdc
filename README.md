# node-pwdc
a Microservice to store woocommerce order on MS SQL Server database using node + express + mssql

What it does when user completing the payment via midtrans, wp sending post request via wafvel-plugin and then :
- wp send data to wafvel for whatsapp
- wp send data to this node-pwdc for saving wp order data to MS Sql Server