-- Create a function to decrement stock safely
CREATE OR REPLACE FUNCTION decrement_stock(product_id BIGINT, quantity INT)
RETURNS VOID AS $$
BEGIN
  UPDATE products
  SET stock_quantity = GREATEST(stock_quantity - quantity, 0)
  WHERE id = product_id;
END;
$$ LANGUAGE plpgsql;
