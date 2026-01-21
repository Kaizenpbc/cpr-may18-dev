import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Snackbar,
} from '@mui/material';
import {
  Event as EventIcon,
  EventAvailable as EventAvailableIcon,
  EventBusy as EventBusyIcon,
  HolidayVillage as HolidayVillageIcon,
} from '@mui/icons-material';
import { format, addYears } from 'date-fns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { PickersDay } from '@mui/x-date-pickers/PickersDay';
// ... existing imports ...

// ... inside component ...
const minDate = new Date();
const maxDate = addYears(new Date(), 5);

return (
  // ...
  <LocalizationProvider dateAdapter={AdapterDateFns}>
    <DateCalendar
      value={currentDate}
      onMonthChange={date => date && setCurrentDate(date)}
      minDate={minDate}
      maxDate={maxDate}
      disablePast
      slots={{
        day: CustomDay,
      }}
    />
  </LocalizationProvider>
  // ...
);
};

export default AvailabilityView;
