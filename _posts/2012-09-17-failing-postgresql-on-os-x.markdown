---
layout: post
title: Failing PostgreSQL on OS X
---

# Failing PostgreSQL on OS X

Today there will be only quick tip. Have you ever come back to work on monday
and seen following error after lanunching your Rails development:

<pre class="terminal">
<code>
could not connect to server: Connection refused (PG::Error)
        Is the server running on host "localhost" (::1) and accepting
        TCP/IP connections on port 5432?
could not connect to server: Connection refused
        Is the server running on host "localhost" (127.0.0.1) and accepting
        TCP/IP connections on port 5432?
could not connect to server: Connection refused
        Is the server running on host "localhost" (fe80::1) and accepting
        TCP/IP connections on port 5432?
</code>
</pre>

If you installed PostgreSQL via homebrew, you might want try removing postmaster.pid,
what helped me:

<pre class="terminal">
<code>
rm /usr/local/var/postgres/postmaster.pid
</code>
</pre>
