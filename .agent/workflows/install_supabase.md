---
description: Install Supabase CLI and Deploy Function
---

1.  **Install Supabase CLI** (if not already installed):
    ```bash
    npm install -g supabase
    ```
    *Note: You might need to use `sudo` if you get permission errors: `sudo npm install -g supabase`*

2.  **Deploy the Function**:
    ```bash
    supabase functions deploy share --no-verify-jwt
    ```
