-- Create trigger function to auto-calculate session_end
CREATE OR REPLACE FUNCTION calculate_session_end()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.session_time IS NOT NULL AND NEW.session_duration_minutes IS NOT NULL THEN
    NEW.session_end := NEW.session_time + (NEW.session_duration_minutes || ' minutes')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on event_speakers
DROP TRIGGER IF EXISTS trigger_calculate_session_end ON event_speakers;
CREATE TRIGGER trigger_calculate_session_end
BEFORE INSERT OR UPDATE OF session_time, session_duration_minutes ON event_speakers
FOR EACH ROW
EXECUTE FUNCTION calculate_session_end();
