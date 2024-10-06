Abstract data type:---->Admin Page—-> Donor(Main Table er address)
CREATE OR REPLACE TYPE address_typ AS OBJECT (
  house_no NUMBER,
  street_name VARCHAR2(100),
  city VARCHAR2(100)
);
ALTER TABLE Donor ADD (address address_typ);


Virtual column—> Needy_people er annual_income

ALTER TABLE Needy_People ADD (
    annual_income NUMBER GENERATED ALWAYS AS (monthly_income * 12) VIRTUAL
);

TABLE VIEW:---->Admin Page—->Transaction(Main Table)
CREATE OR REPLACE VIEW transaction_view AS
SELECT 
    t.trans_id, 
    CASE
        WHEN t.body_id = 'admin' THEN 'admin'
        WHEN t.body_id LIKE 'e%' THEN (SELECT e.event_name FROM event e WHERE e.event_id = t.body_id)
        WHEN t.body_id LIKE 'p%' THEN (SELECT p.type FROM project p WHERE p.project_id = t.body_id)
        WHEN t.body_type = 'donor' THEN (SELECT d.name FROM donor d WHERE d.user_id = t.body_id)
        WHEN t.body_type = 'needy people' THEN (SELECT np.name FROM needy_people np WHERE np.user_id = t.body_id)
        ELSE 'Unknown'
    END AS USERNAME,
    t.amount, 
    t.status,
    t.body_type
FROM 
    transaction t;

Trigger & Sequence—->event_id, project_id, trans_id, fin_help_id, staff_id, donation_id increment

Sign up and Sign in & login:


SELECT * FROM password WHERE UPPER(USER_TYPE) = UPPER(:account) AND UPPER(USER_ID) = UPPER(:username)
SELECT USER_ID FROM ${table} WHERE USER_ID = :username
INSERT INTO ${table} (USER_ID, EMAIL, PHONE, ADDRESS, GENDER, DOB, NAME)
      VALUES (:username, :email, :phone, :address, :gender, TO_DATE(:dob, 'YYYY-MM-DD'), :name)
INSERT INTO password (USER_ID, USER_TYPE, PASSWORD)
      VALUES (:username, :accountType, :password)`


####HomePage/Landing Page#####

SELECT COUNT(event_id) AS count FROM event;
SELECT COUNT(project_id) AS count FROM project;
SELECT COUNT(staff_id) AS count FROM staff;
SELECT COUNT(user_id) AS count FROM volunteer;
SELECT COUNT(user_id) AS count FROM donor;
SELECT COUNT(DISTINCT location) AS count FROM project;


#####Admin:#####

Event Management: 
#sequence and trigger for auto incrementation:

CREATE SEQUENCE event_seq
START WITH 11
INCREMENT BY 1
NOMAXVALUE;

CREATE OR REPLACE TRIGGER event_id_trigger
BEFORE INSERT ON Event
FOR EACH ROW
BEGIN
  :NEW.event_id := 'e' || LPAD(event_seq.NEXTVAL, 3, '0');
END;

#Main table:
SELECT e.event_id AS id, e.event_name AS name, e.status, s.name AS coordinator, e.total_budget, 
TO_CHAR(e.event_date, 'DD-MON-YYYY') AS event_date
FROM event e, staff s
JOIN staff s ON e.head_id = s.staff_id;




#dropdown(list of staff who are available):
SELECT s.staff_id, s.name
    FROM Staff s
    WHERE s.staff_id NOT IN (
      SELECT DISTINCT e.head_id
      FROM Event e
      WHERE e.head_id IS NOT NULL
    )


#Insertion:

INSERT INTO event (head_id, event_name, status, total_budget, event_date)
VALUES (:head_id, :event_name, :status, :total_budget, TO_DATE(:event_date, 'YYYY-MM-DD'))
RETURNING event_id INTO :event_id;

INSERT INTO task (giver_id, receiver_id, campaign_id, description, status)
VALUES ('admin', :head_id, :campaign_id, 'supervisor', 'Pending');

INSERT INTO transaction (body_id, amount, status, body_type)
VALUES (:body_id, :amount, 'out', 'event');


Project Management:

# sequence and trigger for auto incrementation:

CREATE SEQUENCE project_seq
START WITH 11
INCREMENT BY 1
NOMAXVALUE;

CREATE OR REPLACE TRIGGER project_id_trigger
BEFORE INSERT ON Project
FOR EACH ROW
BEGIN
 
  :NEW.project_id := 'p' || LPAD(project_seq.NEXTVAL, 3, '0');
END;

#dropdown(list of staff for project who are available):

SELECT s.staff_id, s.name
FROM Staff s
WHERE s.staff_id NOT IN (
    SELECT DISTINCT p.head_id
    FROM Project p
    WHERE p.head_id IS NOT NULL
);

#Insert:
INSERT INTO project (type, status, head_id, location, allocated_money, from_date, to_date)
VALUES (:type, :status, :head_id, :location, :allocated_money, TO_DATE(:from_date, 'DD-MON-YYYY'), TO_DATE(:to_date, 'DD-MON-YYYY'))
RETURNING project_id INTO :project_id;

INSERT INTO task (giver_id, receiver_id, campaign_id, description, status)
VALUES ('admin', :head_id, :campaign_id, 'supervisor', 'Pending');

INSERT INTO transaction (body_id, amount, status, body_type)
VALUES (:body_id, :amount, 'out', 'project');




#Main query:
select p.project_id,p.type, p.status,p.location,p.allocated_money,p.from_date,p.to_date, s.name as coordinator
from project p,staff s where p.head_id=s.staff_id


Staff Management:
 sequence and trigger for auto incrementation:

CREATE SEQUENCE staff_seq
START WITH 21
INCREMENT BY 1
NOMAXVALUE;

CREATE OR REPLACE TRIGGER staff_id_trg
BEFORE INSERT ON staff
FOR EACH ROW
BEGIN
  :new.staff_id := 's' || LPAD(staff_seq.NEXTVAL, 4, '0');
END;

Main table:
SELECT s.name, s.designation, p.type, e.event_name, s.salary
FROM staff s
LEFT JOIN project p ON s.staff_id = p.head_id
LEFT JOIN event e ON s.staff_id = e.head_id;

Edit button:
 UPDATE staff 
    SET designation = :designation, salary = :salary
    WHERE staff_id = :id


Add button:
 INSERT INTO staff (name, designation, salary)
    VALUES (:name, :designation, :salary)
    RETURNING staff_id INTO :staff_id

 INSERT INTO password (user_id, user_type, password)
    VALUES (:userid, 'Staff', :password)


#Task Management:
Auto incrementation:
CREATE SEQUENCE task_id_seq 
START WITH 10 
INCREMENT BY 1
NOMAXVALUE;

CREATE OR REPLACE TRIGGER task_id_trigger
BEFORE INSERT ON TASK
FOR EACH ROW
BEGIN
  :NEW.TASK_ID := 't' || LPAD(task_id_seq.NEXTVAL, 3, '0');
END;

Main table:

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


#Transaction:
For auto incrementation:
 
CREATE SEQUENCE trans_id_seq
START WITH 6
INCREMENT BY 1
NOMAXVALUE;

CREATE OR REPLACE TRIGGER trans_id_trigger
BEFORE INSERT ON Transaction
FOR EACH ROW
BEGIN
  :NEW.trans_id := 't' || LPAD(trans_id_seq.NEXTVAL, 4, '0');
END;

Main table:
CREATE OR REPLACE VIEW transaction_view AS
SELECT 
    t.trans_id, 
    CASE
        WHEN t.body_id = 'admin' THEN 'admin'
        WHEN t.body_id LIKE 'e%' THEN (SELECT e.event_name FROM event e WHERE e.event_id = t.body_id)
        WHEN t.body_id LIKE 'p%' THEN (SELECT p.type FROM project p WHERE p.project_id = t.body_id)
        WHEN t.body_type = 'donor' THEN (SELECT d.name FROM donor d WHERE d.user_id = t.body_id)
        WHEN t.body_type = 'needy people' THEN (SELECT np.name FROM needy_people np WHERE np.user_id = t.body_id)
        ELSE 'Unknown'
    END AS USERNAME,
    t.amount, 
    t.status,
    t.body_type
FROM 
    transaction t;

SELECT * FROM transaction_view;

Donor:
Main table:
SELECT name, email, phone, dob, address FROM Donor

Volunteer:
SELECT NID, EMAIL, NAME, PHONE, DOB, GENDER FROM volunteer




#Needy People:
Needy people list:
Select name, email, family_member, monthly_income, address
From needy_people;

Financial requests:
Select n.name, n.annual_income, f.requested_amount
From needy_people n, financial_help f
Where n.user_id=f.user_id
And f.status is null;

Reject:
UPDATE financial_help SET status = :status WHERE user_id = :userId

Grant:
UPDATE financial_help SET status = :status WHERE user_id = :userId

SELECT requested_amount FROM financial_help WHERE user_id = :userId


INSERT INTO transaction (body_id, amount, status, body_type)
        VALUES (:body_id, :amount, 'out', 'needy people')






























#####NEEDY PEOPLE #######
Auto incrementation:
CREATE SEQUENCE fin_help_seq
START WITH 4 
INCREMENT BY 1
NOMAXVALUE;

CREATE OR REPLACE TRIGGER fin_help_id_trigger
BEFORE INSERT ON financial_help
FOR EACH ROW
BEGIN
  :NEW.fin_help_id := 'fh' || LPAD(fin_help_seq.NEXTVAL, 4, '0');
END;

Edit:


UPDATE needy_people 
    SET name = :name, email = :email, family_member = :family_member,
        monthly_income = :monthly_income, address = :address
    WHERE user_id = :id


Profile:
Select user_id, name, email, phone, family_member, monthly_income, annual_income
From needy_people;


Apply fund:

SELECT FIN_HELP_ID, REQUESTED_AMOUNT, STATUS FROM financial_help WHERE USER_ID = :userId

Help_request:
INSERT INTO financial_help ( user_id, requested_amount) 
    VALUES ( :userId, :requestedAmount)


History:
Select requested_amount, status
From financial_help
Where user_id= “




#####Donor######
CREATE SEQUENCE donation_seq
START WITH 2 
INCREMENT BY 1
NOMAXVALUE;

CREATE OR REPLACE TRIGGER donation_id_trigger
BEFORE INSERT ON donation
FOR EACH ROW
BEGIN.
    :NEW.DONATION_ID := 'd' || LPAD(donation_seq.NEXTVAL, 4, '0');
END;

Profile:

 SELECT user_id, name, email, phone, TO_CHAR(dob, 'DD-MON-YYYY') as dob, address 
    FROM donor 
    WHERE user_id = :userid

history:
Select donation_id, amount
From donation
Where user_id = :9 8 3        766757                                                              yrtuoip
userid


Handle donation and update tables


INSERT INTO donation (user_id, amount)
    VALUES (:userId, :amount)
    RETURNING donation_id INTO :donation_id

 INSERT INTO transaction (body_id, amount, status, body_type)
    VALUES (:userId, :amount, 'in', 'donor')









####Staff#########
Profile:
SELECT 
    s.staff_id, 
    p.password, 
    s.name, 
    s.designation, 
    s.salary
FROM 
    Staff s, 
    Password p
WHERE 
    s.staff_id = p.user_id
    AND p.user_type = 'Staff';

Project:
SELECT 
    p.TYPE, 
    p.LOCATION, 
    p.ALLOCATED_MONEY, 
    p.FROM_DATE, 
    p.TO_DATE
FROM 
    PROJECT p, STAFF s
WHERE 
    p.HEAD_ID = s.STAFF_ID
    AND p.STATUS = 'running';

Project finish button:
UPDATE task
SET status = 'done'
WHERE receiver_id = :staff_id
AND campaign_id = :project_id;

UPDATE project
SET status = 'done'
WHERE project_id = :project_id;

UPDATE volunteer
SET status = NULL
WHERE volunteer_id IN (
    SELECT user_id
    FROM volunteering_In
    WHERE campaign_id = :project_id);



Event:
SELECT 
    e.EVENT_NAME, 
    e.TOTAL_BUDGET, 
    e.EVENT_DATE
FROM 
    EVENT e, STAFF s
WHERE 
    e.HEAD_ID = s.STAFF_ID
    AND e.STATUS = 'running';
Event finish button:
UPDATE task
SET status = 'done'
WHERE receiver_id = :staff_id
AND campaign_id = :event_id;

UPDATE event
SET status = 'done'
WHERE project_id = :event_id;

UPDATE volunteer
SET status = NULL
WHERE volunteer_id IN (
    SELECT user_id
    FROM volunteering_In
    WHERE campaign_id = :event_id);

Volunteers:
Available Volunteers:
Select name, email, phone, dob, gender
From volunteer
Where status is null;

Appoint for project:
UPDATE volunteer
SET status = 'working'
WHERE user_id = :user_id;

INSERT INTO volunteering_In (user_id, campaign_id)
VALUES (:user_id, :project_id);



Appoint for event:
UPDATE volunteer
SET status = 'working'
WHERE user_id = :user_id;

INSERT INTO volunteering_In (user_id, campaign_id)
VALUES (:user_id, :event_id);

Volunteer list(for project):
Select v.name, v.email, v.phone,v. dob, v. gender
From volunteer v, volunteering_in vi
Where v.user_id = vi.user_id
And vi.campaign_id=:project_id;

Volunteer list(for event):
Select v.name, v.email, v.phone,v. dob, v. gender
From volunteer v, volunteering_in vi
Where v.user_id = vi.user_id
And vi.campaign_id=:event_id;


Task:
***change ase 2 ta table ashbe**
Tasks for project:
Select task_id, giver_id, receiver_id, campaign_id AS ‘project_id’, description, status
From task where giver_id=:staff_id 
and reciever_id =:user_id
And campaign_id=:project_id;

Task project add button:
INSERT INTO task ( giver_id, receiver_id, campaign_id, description, status)
VALUES (:staff_id, :user_id, :project_id, description, status);


Select volunteer dropdown box:
SELECT name 
FROM volunteer 
WHERE status = 'working' 
  AND user_id IN (
      SELECT user_id 
      FROM volunteering_In 
      WHERE campaign_id = :project_id
  );
Tasks for event:
Select task_id, giver_id, receiver_id, campaign_id AS ‘event_id’, description, status
From task where giver_id=:staff_id 
and reciever_id =:user_id
And campaign_id=:event_id;

Task project add button:
INSERT INTO task ( giver_id, receiver_id, campaign_id, description, status)
VALUES (:staff_id, :user_id, :event_id, description, status);


Select volunteer dropdown box:
SELECT name 
FROM volunteer 
WHERE status = 'working' 
  AND user_id IN (
      SELECT user_id 
      FROM volunteering_In 
      WHERE campaign_id = :event_id
  );

CREATE SEQUENCE vol_in_seq
START WITH 1
INCREMENT BY 1
NOMAXVALUE;

CREATE OR REPLACE TRIGGER trg_vol_in_id
BEFORE INSERT ON Volunteering_In
FOR EACH ROW
BEGIN
  :NEW.vol_in_id := 'vi' || LPAD(vol_in_seq.NEXTVAL, 4, '0');
END;













#####Volunteer####
Profile:
 SELECT USER_ID, NID, EMAIL, NAME, PHONE, TO_CHAR(dob, 'DD-MON-YYYY') as DOB, GENDER
    FROM volunteer 
    WHERE user_id = :userid

Edit:
 UPDATE volunteer
    SET NID = :nid, EMAIL = :email, NAME = :name, PHONE = :phone, DOB = :dob, GENDER = :gender
    WHERE USER_ID = :userid


Pending task:
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

TASK DONE BUTTON:
 UPDATE task
    SET status = 'done'
    WHERE task_id = :taskId

Completed task:

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









