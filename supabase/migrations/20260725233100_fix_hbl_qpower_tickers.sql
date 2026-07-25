-- Correct key_thesis_metrics updates for HBL Engineering and Quality Power using correct tickers
UPDATE public.stocks SET key_thesis_metrics = 'Kavach Revenue, Kavach Order Book, Railway Electronics, Battery Business, Defence, Export Revenue, EBITDA Margin, OCF' WHERE ticker = 'HBLENGINE' OR ticker = 'HBL';
UPDATE public.stocks SET key_thesis_metrics = 'Order Book, Order Inflow, Book-to-Bill, Sangli Project, Export Share, Receivable Days, Capacity Utilization, OCF' WHERE ticker = 'QPOWER' OR ticker = 'QPEL';
