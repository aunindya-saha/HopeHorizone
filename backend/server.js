const express= require('express');
const cors= require("cors");
const oracledb= require('oracledb');
const runDatabaseQuery = require('./dbConfig');
const port=8081;


const app=express();
app.use(express.json());
app.use(cors());
 

//home page query
app.get('/api/services-count', async (req, res) => {
  try {
    // Query to count the number of events
    const eventQuery = `SELECT COUNT(event_id) AS count FROM event`;
    const eventResult = await runDatabaseQuery(eventQuery);
    const eventsCount = eventResult.rows[0].COUNT;

    // Query to count the number of projects
    const projectQuery = `SELECT COUNT(project_id) AS count FROM project`;
    const projectResult = await runDatabaseQuery(projectQuery);
    const projectsCount = projectResult.rows[0].COUNT;

    // Query to count the number of staff members
    const staffQuery = `SELECT COUNT(staff_id) AS count FROM staff`;
    const staffResult = await runDatabaseQuery(staffQuery);
    const staffCount = staffResult.rows[0].COUNT;

    // Query to count the number of volunteers
    const volunteerQuery = `SELECT COUNT(user_id) AS count FROM volunteer`;
    const volunteerResult = await runDatabaseQuery(volunteerQuery);
    const volunteersCount = volunteerResult.rows[0].COUNT;

    // Query to count the number of donors
    const donorQuery = `SELECT COUNT(user_id) AS count FROM donor`;
    const donorResult = await runDatabaseQuery(donorQuery);
    const donorsCount = donorResult.rows[0].COUNT;

    // Query to count unique regions in the project table
    const regionQuery = `SELECT COUNT(DISTINCT location) AS count FROM project`;
    const regionResult = await runDatabaseQuery(regionQuery);
    const regionsCount = regionResult.rows[0].COUNT;

    // Send the counts back to the frontend
    res.json({
      success: true,
      counts: {
        events: eventsCount,
        projects: projectsCount,
        staff: staffCount,
        volunteers: volunteersCount,
        donors: donorsCount,
        regions: regionsCount,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error fetching service counts.' });
  }
});


//new login
app.post('/api/signin', async (req, res) => {
 // console.log("Signin route hit");
  const { account, username, password } = req.body; // Destructure the incoming data

  // Check if all required fields are provided
  if (!account || !username || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  // SQL query to find the user based on account type and username
  const query = `SELECT * FROM password WHERE UPPER(USER_TYPE) = UPPER(:account) AND UPPER(USER_ID) = UPPER(:username)`; // Correct the query with quotes
  const values = { account, username }; // Values passed for the query

  try {
    // Run the query to fetch user data
    const result = await runDatabaseQuery(query, values).then(data => data?.rows || []); // Ensure runDatabaseQuery is defined and properly used

    if (result.length > 0) {
      const storedPassword = result[0].PASSWORD; // Password field is 'PASSWORD'

      // Check if stored password exists and matches
      if (storedPassword) {
        return res.json({ success: true, message: 'Login successful.' });
      } else {
        return res.status(401).json({ success: false, message: 'Invalid password.' });
      }
    } else {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
});


//registration
app.post('/api/signup/:accountType', async (req, res) => {
  console.log("backend hit");
  const { accountType } = req.params;
  const { username, email, phone, address, gender, dob, password, name } = req.body;

  // Validate required fields
  if (!username || !email || !phone || !address || !gender || !dob || !password || !name) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  // Determine the table based on accountType
  let table = '';
  if (accountType === 'donor') {
    table = 'donor';
  } else if (accountType === 'volunteer') {
    table = 'volunteer';
  } else if (accountType === 'needy_people') {
    table = 'needy_people';
  } else {
    return res.status(400).json({ success: false, message: 'Invalid account type.' });
  }

  try {
    // Check if username already exists
    const checkUsernameQuery = `SELECT USER_ID FROM ${table} WHERE USER_ID = :username`;
    const checkUsername = await runDatabaseQuery(checkUsernameQuery, { username });

    if (checkUsername.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Username already exists.' });
    }

    // Insert into the specific account table
    const insertUserQuery = `
      INSERT INTO ${table} (USER_ID, EMAIL, PHONE, ADDRESS, GENDER, DOB, NAME)
      VALUES (:username, :email, :phone, :address, :gender, TO_DATE(:dob, 'YYYY-MM-DD'), :name)`;
    const userValues = { username, email, phone, address, gender, dob, name };

    console.log('insertUserQuery', insertUserQuery);
    console.log('userValues', userValues);
    const userInsertResult = await runDatabaseQuery(insertUserQuery, userValues);
console.log(userInsertResult);
    if (userInsertResult.rowsAffected === 0) {
      return res.status(500).json({ success: false, message: 'Failed to create user in user table.' });
    }

    // Insert into the password table
    const insertPasswordQuery = `
      INSERT INTO password (USER_ID, USER_TYPE, PASSWORD)
      VALUES (:username, :accountType, :password)`;
    const passwordValues = { username, accountType, password };

    const passwordInsertResult = await runDatabaseQuery(insertPasswordQuery, passwordValues);

    if (passwordInsertResult.rowsAffected === 0) {
      return res.status(500).json({ success: false, message: 'Failed to create user in password table.' });
    }

    // If both queries succeed
    res.status(201).json({ success: true, message: 'Account created successfully.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});















//admin dashboard events functional queries

// POST /api/events (Add event)
// POST /api/events (Add event)
app.post('/api/events', async (req, res) => {
  const { event_name, status, head_id, total_budget, event_date } = req.body;

  // Insert query for the event table with RETURNING INTO to get the new event_id
  const eventInsertQuery = `
    INSERT INTO event (head_id, event_name, status, total_budget, event_date)
    VALUES (:head_id, :event_name, :status, :total_budget, TO_DATE(:event_date, 'YYYY-MM-DD'))
    RETURNING event_id INTO :event_id
  `;

  // Insert query for the task table
  const taskInsertQuery = `
    INSERT INTO task (giver_id, receiver_id, campaign_id, description, status)
    VALUES ('admin', :head_id, :campaign_id, 'supervisor', 'Pending')
  `;

  // Insert query for the transaction table
  const transactionInsertQuery = `
    INSERT INTO transaction (body_id, amount, status, body_type)
    VALUES (:body_id, :amount, 'out', 'event')
  `;

  try {
    // Bind variables for the event insertion
    const eventBinds = {
      head_id,
      event_name,
      status,
      total_budget,
      event_date,
      event_id: { dir: oracledb.BIND_OUT },  // BIND_OUT to store the new event_id
    };

    // Insert event details and get the newly generated event_id
    const eventResult = await runDatabaseQuery(eventInsertQuery, eventBinds);
    const eventId = eventResult.outBinds.event_id[0];  // Fetch returned event_id

    // Insert the corresponding task using the newly created event_id
    await runDatabaseQuery(taskInsertQuery, { head_id, campaign_id: eventId });

    // Insert the transaction using the newly created event_id and total_budget
    const transactionBinds = {
      body_id: eventId,
      amount: total_budget
    };
    await runDatabaseQuery(transactionInsertQuery, transactionBinds);

    res.status(201).json({ message: 'Event, task, and transaction added successfully', eventId });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});


// Fetch event details

app.get('/api/events', async (req, res) => {
  // SQL query to retrieve events with the event_date formatted as DD-MON-YYYY
  const query = `
    SELECT e.event_id AS id, e.event_name AS name, e.status, 
           s.name AS coordinator, e.total_budget, 
           TO_CHAR(e.event_date, 'DD-MON-YYYY') AS event_date
    FROM event e
    JOIN staff s ON e.head_id = s.staff_id
  `;

  try {
    const result = await runDatabaseQuery(query);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

//event dropdown coordinator assign
app.get('/api/freeEventStaff', async (req, res) => {
  const query = `
    SELECT s.staff_id, s.name
    FROM Staff s
    WHERE s.staff_id NOT IN (
      SELECT DISTINCT e.head_id
      FROM Event e
      WHERE e.head_id IS NOT NULL
    )
  `;
  
  try {
    const result = await runDatabaseQuery(query);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
  


// PUT /api/events/:id (Update event)
app.put('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  const { event_name, status, head_id, total_budget, total_expenditure } = req.body;

  // Ensure null-safe updates
  const query = ` UPDATE event SET event_name = :event_name, status = :status, head_id = :head_id,total_budget = :total_budget, 
    total_expenditure = :total_expenditure WHERE event_id = :id`;

  try {
    await runDatabaseQuery(query, { event_name, status, head_id, total_budget, total_expenditure, id });
    res.status(200).json({ message: 'Event updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.delete('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  const query = `DELETE FROM event WHERE event_id = :id `;

  try {
    await runDatabaseQuery(query, { id });
    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Database error' });
  }
});

//Project list showing admin dahsboard

app.get('/api/projects', async (req, res) => {
 // console.log("show data hit");
  const query = `select p.project_id,p.type, p.status,p.location,p.allocated_money,p.from_date,p.to_date, s.name as coordinator
from project p,staff s where p.head_id=s.staff_id `;

  try {
    const result = await runDatabaseQuery(query);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
//add project
app.post('/api/projects', async (req, res) => {
  const { type, status, head_id, location, allocated_money, from_date, to_date } = req.body;

  // Insert query for the project table with RETURNING INTO to get the new project_id
  const projectInsertQuery = `
    INSERT INTO project (type, status, head_id, location, allocated_money, from_date, to_date)
    VALUES (:type, :status, :head_id, :location, :allocated_money, TO_DATE(:from_date, 'DD-MON-YYYY'), TO_DATE(:to_date, 'DD-MON-YYYY'))
    RETURNING project_id INTO :project_id
  `;

  // Insert query for the task table
  const taskInsertQuery = `
    INSERT INTO task (giver_id, receiver_id, campaign_id, description, status)
    VALUES ('admin', :head_id, :campaign_id, 'supervisor', 'Pending')
  `;

  // Insert query for the transaction table
  const transactionInsertQuery = `
    INSERT INTO transaction (body_id, amount, status, body_type)
    VALUES (:body_id, :amount, 'out', 'project')
  `;

  try {
    // Bind variables to store the returned project_id
    const projectBinds = { 
      type, 
      status, 
      head_id, 
      location, 
      allocated_money, 
      from_date, 
      to_date,
      project_id: { dir: oracledb.BIND_OUT }  // BIND_OUT to store the new project_id
    };

    // Insert project details and get the newly generated project_id
    const projectResult = await runDatabaseQuery(projectInsertQuery, projectBinds);
    const projectId = projectResult.outBinds.project_id[0]; // Get the returned project_id

    // Insert the corresponding task using the newly created project_id
    await runDatabaseQuery(taskInsertQuery, { head_id, campaign_id: projectId });

    // Insert the transaction using the newly created project_id and allocated_money
    const transactionBinds = {
      body_id: projectId,
      amount: allocated_money
    };
    await runDatabaseQuery(transactionInsertQuery, transactionBinds);

    res.status(201).json({ message: 'Project, task, and transaction added successfully', projectId });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});


//dropdown of free staff list for project coord

app.get('/api/freeProjectStaff', async (req, res) => {
  const query = `
    SELECT s.staff_id, s.name
FROM Staff s
WHERE s.staff_id NOT IN (
    SELECT DISTINCT p.head_id
    FROM Project p
    WHERE p.head_id IS NOT NULL
)

  `;
  
  try {
    const result = await runDatabaseQuery(query);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


//Staff list showing admin dahsboard

app.get('/api/staff', async (req, res) => {
//  console.log("show data hit");
  const query = `SELECT s.staff_id,s.name, s.designation, p.type, e.event_name, s.salary
FROM staff s
LEFT JOIN project p ON s.staff_id = p.head_id
LEFT JOIN event e ON s.staff_id = e.head_id`;

  try {
    const result = await runDatabaseQuery(query);
 //   console.log(result);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
//New Staff Add
app.post('/api/staffadd', async (req, res) => {
  const { name, designation, salary, password } = req.body; // Get password from request

  // Insert query for the staff table with RETURNING INTO
  const staffInsertQuery = `
    INSERT INTO staff (name, designation, salary)
    VALUES (:name, :designation, :salary)
    RETURNING staff_id INTO :staff_id
  `;

  // Insert query for the password table
  const passwordInsertQuery = `
    INSERT INTO password (user_id, user_type, password)
    VALUES (:userid, 'Staff', :password)
  `;

  try {
    // Bind variables to store the returned staff_id
    const binds = { 
      name, 
      designation, 
      salary, 
      staff_id: { dir: oracledb.BIND_OUT }  // BIND_OUT to store the staff_id
    };

    // Insert staff details and get the newly generated staff_id
    const result = await runDatabaseQuery(staffInsertQuery, binds);
    const staffId = result.outBinds.staff_id[0]; // Get the returned staff_id from outBinds

    // Insert the generated staff_id, usertype, and password into the password table
    await runDatabaseQuery(passwordInsertQuery, { userid: staffId, password });

    res.status(201).json({ message: 'Staff added successfully', staffId });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});


//Staff Info update
app.put('/api/staffupdate/:id', async (req, res) => {
  const { id } = req.params;
  const { designation, salary } = req.body;

  const query = `
    UPDATE staff 
    SET designation = :designation, salary = :salary
    WHERE staff_id = :id
  `;

  try {
    await runDatabaseQuery(query, { designation, salary, id });
    res.status(200).json({ message: 'Staff updated successfully' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});


//donor list showing admin dashboard
app.get('/api/donors', async (req, res) => {
  //  console.log("show data hit");
  const query = `
    SELECT
      name, email, phone, dob, address FROM Donor`;
    try {
      const result = await runDatabaseQuery(query);
   //   console.log(result);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });


//admin NEEDY PEOPLE SHOWCASE

app.get('/api/needyPeople', async (req, res) => {
  //  console.log("show data hit");
  const query = `SELECT NAME, EMAIL, FAMILY_MEMBER, MONTHLY_INCOME, ADDRESS FROM NEEDY_PEOPLE`;
    try {
      const result = await runDatabaseQuery(query);
   //   console.log(result);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  });
  //card show of financial request in admin
  app.get('/api/financialHelp', async (req, res) => {
    //  console.log("show data hit");
    const query = `select n.user_id, n.name, n.annual_income, f.requested_amount from needy_people n, financial_help f
  where n.user_id=f.user_id and f.status is null`;
      try {
        const result = await runDatabaseQuery(query);
     //   console.log(result);
        res.json({ success: true, data: result });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });
  //admin financial help grant reject
    app.post('/api/financialHelp/:userId', async (req, res) => {
      console.log("backend hit");
      const { status } = req.body;
      const userId = req.params.userId;
      console.log(status);
    
      // Update query for the financial_help table
      const updateQuery = `UPDATE financial_help SET status = :status WHERE user_id = :userId`;
    
      // Query to get the requested_amount using userId
      const getAmountQuery = `SELECT requested_amount FROM financial_help WHERE user_id = :userId`;
    
      // Insert query for the transaction table
      const transactionInsertQuery = `
        INSERT INTO transaction (body_id, amount, status, body_type)
        VALUES (:body_id, :amount, 'out', 'needy people')
      `;
    
      try {
        // Update the status of financial_help entry for the user
        await runDatabaseQuery(updateQuery, { userId, status });
    
        if (status === 'granted') {
          // Fetch the requested_amount from the financial_help table using userId
          const amountResult = await runDatabaseQuery(getAmountQuery, { userId });
          const requestedAmount = amountResult.rows[0].REQUESTED_AMOUNT; // Assuming result has the column name as REQUESTED_AMOUNT
    
          // Insert a new transaction with the retrieved amount
          const transactionBinds = {
            body_id: userId,
            amount: requestedAmount
          };
          await runDatabaseQuery(transactionInsertQuery, transactionBinds);
        }
    
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });     

  

//volunteer list admin dashboard

app.get('/api/volunteers', async (req, res) => {
  const query = `SELECT NID, EMAIL, NAME, PHONE, DOB, GENDER FROM volunteer`;

  try {
    const result = await runDatabaseQuery(query);
    const rows = result.rows;  // Extracting the actual rows
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});



//task list admin dashboard

app.get('/api/tasks', async (req, res) => {
  const query = `
    SELECT t.TASK_ID, s.NAME, 
    CASE 
    WHEN t.CAMPAIGN_ID LIKE 'p%' THEN p.TYPE 
    WHEN t.CAMPAIGN_ID LIKE 'e%' THEN e.EVENT_NAME 
    ELSE 'Unknown' 
  END AS CAMPAIGN_INFO,  
  t.DESCRIPTION, 
  t.STATUS
FROM task t
LEFT JOIN staff s ON t.RECEIVER_ID = s.STAFF_ID
LEFT JOIN project p ON t.CAMPAIGN_ID = p.PROJECT_ID
LEFT JOIN event e ON t.CAMPAIGN_ID = e.EVENT_ID
  `;
  
  try {
    const result = await runDatabaseQuery(query);
    const tasks = result?.rows || [];
    res.json({ success: true, tasks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

//admin transaction view table show
// SELECT 
//     t.trans_id, 
//     CASE
//         WHEN t.body_id = 'admin' THEN 'admin'
//         WHEN t.body_id LIKE 'e%' THEN (SELECT e.event_name FROM event e WHERE e.event_id = t.body_id)
//         WHEN t.body_id LIKE 'p%' THEN (SELECT p.type FROM project p WHERE p.project_id = t.body_id)
//         WHEN t.body_type = 'donor' THEN (SELECT d.name FROM donor d WHERE d.user_id = t.body_id)
//         WHEN t.body_type = 'needy people' THEN (SELECT np.name FROM needy_people np WHERE np.user_id = t.body_id)
//         ELSE 'Unknown'
//     END AS USERNAME,
//     t.amount, 
//     t.status,
//     t.body_type
// FROM 
//     transaction t

app.get('/api/transaction', async (req, res) => {
  const query = `SELECT * FROM transaction_view`;

  try {
    const result = await runDatabaseQuery(query);
    const rows = result.rows;  // Extracting the actual rows
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});




//needy people profile showing
app.get('/api/needy_people/:storedUserId', async (req, res) => {
  const { storedUserId } = req.params; // Extract the storedUserId from the request
  const query = `SELECT user_id, name, email, family_member, monthly_income, address, annual_income FROM needy_people WHERE user_id = :user_id`;

  try {
    const result = await runDatabaseQuery(query, [storedUserId]); // Pass storedUserId as parameter
    const rows = result.rows;  // Extracting the actual rows
    if (rows.length > 0) {
      res.json({ success: true, data: rows[0] }); // Send only the first row since it's a single user
    } else {
      res.status(404).json({ success: false, message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


//needy people personal data modify

app.put('/api/needy_people/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, family_member, monthly_income, address, annual_income } = req.body;

  const query = `
    UPDATE needy_people 
    SET name = :name, email = :email, family_member = :family_member,
        monthly_income = :monthly_income, address = :address
    WHERE user_id = :id
  `;

  try {
    await runDatabaseQuery(query, { name, email, family_member, monthly_income, address, id });
    res.status(200).json({ message: 'Profile updated successfully!' });
  } catch (error) {
    console.error('Database error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});


//needy people help data
app.get('/api/financial_help/:userId', async (req, res) => {
  const { userId } = req.params;
  const query = `SELECT FIN_HELP_ID, REQUESTED_AMOUNT, STATUS FROM financial_help WHERE USER_ID = :userId`; // Bind variable

  try {
    const result = await runDatabaseQuery(query, { userId }); // Pass the userId as a bind value
    const rows = result.rows;  // Extracting the actual rows
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

//needy people apply form information
app.get('/api/needy_people/apply_help/:userId', async (req, res) => {
  const { userId } = req.params;
  const query = `SELECT family_member, annual_income FROM needy_people WHERE user_id = :userId`;

  try {
    const result = await runDatabaseQuery(query, { userId });
    if (result.rows.length > 0) {
      const userData = result.rows[0];
      res.json({ success: true, family_members: userData.FAMILY_MEMBERS, annual_income: userData.ANNUAL_INCOME });
    } else {
      res.status(404).json({ success: false, message: "User not found" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

//financial help table update
app.post('/api/financial_help', async (req, res) => {
  const { userId, requestedAmount } = req.body;
  const query = `
    INSERT INTO financial_help ( user_id, requested_amount) 
    VALUES ( :userId, :requestedAmount)
  `;

  try {
    await runDatabaseQuery(query, { userId, requestedAmount });
    res.json({ success: true, message: "Application submitted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// Fetch donor profile
app.get("/api/donor/profile/:userid", async (req, res) => {
  const { userid } = req.params;
  const query = `
    SELECT user_id, name, email, phone, TO_CHAR(dob, 'DD-MON-YYYY') as dob, address 
    FROM donor 
    WHERE user_id = :userid
  `;
  try {
    const result = await runDatabaseQuery(query, { userid });
    res.json(result.rows[0]); // Assuming one row is returned
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Fetch donation history
app.get("/api/donor/donations/:userid", async (req, res) => {
  const { userid } = req.params;
  console.log("Fetching donations for user:", userid);
  
  const query = `
    SELECT donation_id, amount
    FROM donation
    WHERE user_id = :userid
  `;

  try {
    const result = await runDatabaseQuery(query, { userid });
    if (result.rows.length > 0) {
      res.json(result.rows); // Send all donation rows back as a response
    } else {
      res.status(404).json({ message: "No donations found for this user" });
    }
  } catch (error) {
    console.error("Error fetching donations:", error);
    res.status(500).json({ error: "Database error" });
  }
});





//volunteer profile
// app.get("/api/volunteer/profile/:userid", async (req, res) => {
//   const { userid } = req.params;
//   console.log("Fetching profile for user:", userid);
  
//   const query = `
//     SELECT USER_ID, NID, EMAIL, NAME, PHONE, DOB, GENDER
//     FROM volunteer
//     WHERE USER_ID = :userid
//   `;

//   try {
//     const result = await runDatabaseQuery(query, { userid });
//     if (result.rows.length > 0) {
//       res.json(result.rows[0]); // Send the first row back as a response
//     } else {
//       res.status(404).json({ error: "User not found" });
//     }
//   } catch (error) {
//     console.error("Error fetching profile:", error);
//     res.status(500).json({ error: "Database error" });
//   }
// });

// Handle donation and update tables
app.post("/api/donor/donate", async (req, res) => {
  const { userId, amount } = req.body;
console.log(userId);
  const donationInsertQuery = `
    INSERT INTO donation (user_id, amount)
    VALUES (:userId, :amount)
    RETURNING donation_id INTO :donation_id
  `;

  const transactionInsertQuery = `
    INSERT INTO transaction (body_id, amount, status, body_type)
    VALUES (:userId, :amount, 'in', 'donor')
  `;

  try {
    // Insert into donation table and get the donation_id
    const donationResult = await runDatabaseQuery(donationInsertQuery, {
      userId,
      amount,
      donation_id: { dir: oracledb.BIND_OUT },
    });
    const donationId = donationResult.outBinds.donation_id[0];

    // Insert into transaction table
    await runDatabaseQuery(transactionInsertQuery, { userId, amount });

    res.status(201).json({ message: "Donation and transaction successful", donationId });
  } catch (error) {
    console.error("Error processing donation:", error);
    res.status(500).json({ error: "Database error" });
  }
});


//volunteer id show

app.get("/api/volunteer/profile/:userid", async (req, res) => {
  const { userid } = req.params;
  console.log(userid);
  const query = `
    SELECT USER_ID, NID, EMAIL, NAME, PHONE, TO_CHAR(dob, 'DD-MON-YYYY') as DOB, GENDER
    FROM volunteer 
    WHERE user_id = :userid
  `;
  try {
    const result = await runDatabaseQuery(query, { userid });
    res.json(result.rows[0]); // Assuming one row is returned
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Database error" });
  }
});

// Update volunteer profile
app.post("/api/volunteer/update/:userid", async (req, res) => {
  const { userid } = req.params;
  const { nid, email, name, phone, dob, gender } = req.body;
  const query = `
    UPDATE volunteer
    SET NID = :nid, EMAIL = :email, NAME = :name, PHONE = :phone, DOB = :dob, GENDER = :gender
    WHERE USER_ID = :userid
  `;
  try {
    await runDatabaseQuery(query, { nid, email, name, phone, dob, gender, userid });
    res.json({ success: true, message: "Profile updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Endpoint to fetch pending tasks for a user
app.get("/api/tasks/pending/:userid", async (req, res) => {
  const { userid } = req.params;  // Get the userid from the request parameters
  console.log("backend hit for user:", userid);
  const query = `
    SELECT
      t.task_id,
      s.name,
      CASE
        WHEN t.campaign_id LIKE 'p%' THEN p.type
        WHEN t.campaign_id LIKE 'e%' THEN e.event_name
        ELSE NULL
      END AS campaign_detail,
      t.description
    FROM
      task t
    JOIN
      staff s ON t.giver_id = s.staff_id  
    JOIN
      volunteer v ON t.receiver_id = v.user_id 
    LEFT JOIN
      project p ON t.campaign_id = p.project_id 
    LEFT JOIN
      event e ON t.campaign_id = e.event_id 
    WHERE
      v.status = 'working'  
      and t.status = 'pending'
      AND t.receiver_id = :userid
  `;
  
  try {
    const result = await runDatabaseQuery(query, { userid }); // Pass userid to the query
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ error: "Database error" });
  }
});






// Endpoint to mark a task as done
app.post("/api/tasks/mark-done/:taskId", async (req, res) => {
  const { taskId } = req.params;
  const query = `
    UPDATE task
    SET status = 'done'
    WHERE task_id = :taskId
  `;
  try {
    const result = await runDatabaseQuery(query, { taskId });
    res.status(200).json({ message: "Task marked as done successfully." });
  } catch (error) {
    console.error("Error updating task status:", error);
    res.status(500).json({ error: "Database error" });
  }
});
//completed task

app.get("/api/tasks/completed/:userid", async (req, res) => {
  const { userid } = req.params;  // Get the userid from the request parameters
  console.log("Fetching completed tasks for user:", userid);

  const query = `
    SELECT
      t.task_id,
      s.name,
      CASE
        WHEN t.campaign_id LIKE 'p%' THEN p.type
        WHEN t.campaign_id LIKE 'e%' THEN e.event_name
        ELSE NULL
      END AS campaign_detail,
      t.description
    FROM
      task t
    JOIN
      staff s ON t.giver_id = s.staff_id  
    JOIN
      volunteer v ON t.receiver_id = v.user_id 
    LEFT JOIN
      project p ON t.campaign_id = p.project_id 
    LEFT JOIN
      event e ON t.campaign_id = e.event_id 
    WHERE
      t.status = 'done' 
      AND t.receiver_id = :userid
  `;
  
  try {
    const result = await runDatabaseQuery(query, { userid }); // Adjust runDatabaseQuery function to your actual query executor
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching completed tasks:", error);
    res.status(500).json({ error: "Database error" });
  }
});
 
 app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });


