const handleAssignOpen = async (instructor: Instructor) => {
  setSelectedInstructor(instructor);
  setAssignDialogOpen(true);
  try {
    const date = new Date();
    const formattedDate = date.toISOString().split('T')[0]; // Format as yyyy-MM-dd
    const response = await api.getAvailableInstructors(formattedDate);
    setAvailableInstructors(response.data);
  } catch (error) {
    console.error('Error fetching available instructors:', error);
  }
}; 