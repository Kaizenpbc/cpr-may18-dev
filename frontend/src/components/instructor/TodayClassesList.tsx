import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Paper,
  Button,
} from '@mui/material';
import {
  Class as ClassIcon,
  Group as GroupIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { formatDisplayDate } from '../../utils/dateUtils';

interface ClassData {
  id: number;
  coursetype: string;
  location: string;
  date: string;
  studentcount: number;
}

interface TodayClassesListProps {
  classes?: ClassData[];
}

const TodayClassesList: React.FC<TodayClassesListProps> = ({ classes = [] }) => {
  const navigate = useNavigate();

  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Today's Classes
      </Typography>
      <Paper variant="outlined">
        {classes.length > 0 ? (
          <List>
            {classes.map((cls, index) => (
              <React.Fragment key={cls.id}>
                <ListItem>
                  <ListItemText
                    primary={
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ClassIcon color="primary" />
                        <Typography variant="subtitle1" component="span">
                          {cls.coursetype} - {cls.location}
                        </Typography>
                      </span>
                    }
                    secondary={
                      <span style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <TimeIcon fontSize="small" />
                          <Typography variant="body2" component="span">
                            {formatDisplayDate(cls.date)}
                          </Typography>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <GroupIcon fontSize="small" />
                          <Typography variant="body2" component="span">
                            {cls.studentcount} Students
                          </Typography>
                        </span>
                      </span>
                    }
                    components={{
                      primary: 'div',
                      secondary: 'div'
                    }}
                  />
                  <ListItemSecondaryAction>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => navigate(`/instructor/attendance/${cls.id}`)}
                    >
                      Take Attendance
                    </Button>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < classes.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        ) : (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography color="text.secondary">No classes scheduled for today</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default TodayClassesList; 