

//GENERATING

<?php
echo password_hash("admin123", PASSWORD_DEFAULT);
?>

//INSERTING TO SQL

INSERT INTO users (fullname, username, password, role)
VALUES ('System Admin', 'admin', 'PASTE_HASH_HERE', 'admin');