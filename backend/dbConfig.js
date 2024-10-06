const oracledb = require('oracledb');

async function runDatabaseQuery(query, binds = {}, options = { autoCommit: true, outFormat: oracledb.OUT_FORMAT_OBJECT }) {
  let connection;

  try {
    connection = await oracledb.getConnection({
      user: 'APS',
      password: '123',  // Replace with the actual password for APS user
      connectString: 'localhost:1521/xe'
    });

   console.log('Connection established!');

    const result = await connection.execute(query, binds, options);
    console.log("=>>", result);

    return result;

  } catch (err) {
    console.error('Error occurred:', err);
    throw err;
  } finally {
    // if (connection) {
    //   try {
    //     await connection.close();
    //     console.log('Connection closed!');
    //   } catch (err) {
    //     console.error('Error closing connection:', err);
    //   }
    // }
  }
}

module.exports = runDatabaseQuery;
