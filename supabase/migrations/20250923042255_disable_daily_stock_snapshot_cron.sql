-- Unschedules the daily stock snapshot cron job

SELECT cron.unschedule('daily-stock-snapshot');
