UPDATE `users`
SET `name` = '管理者', `updated_at` = CURRENT_TIMESTAMP
WHERE `id` = 'admin'
  AND `role` = 'admin'
  AND `name` = '岡上幸央';
