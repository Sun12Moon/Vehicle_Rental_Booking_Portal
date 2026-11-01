ALTER TABLE payments
  MODIFY payment_method ENUM('UPI', 'CARD', 'NET_BANKING', 'WALLET', 'CASH') NOT NULL;
