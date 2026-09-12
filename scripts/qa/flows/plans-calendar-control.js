var state = json(http.get('http://127.0.0.1:54329/__qa/state').body).tables;
var soccer = state.activities.filter(function(p) { return p.name.indexOf('QA Saturday soccer ') === 0; }).slice(-1)[0];
var camp = state.activities.filter(function(p) { return p.name.indexOf('QA weekday makers camp ') === 0; }).slice(-1)[0];
if (!soccer || !camp) throw new Error('Run plans-programs.yaml before the calendar flow.');
var dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function dayLabel(date) { return dayNames[date.getDay()] + ', ' + months[date.getMonth()] + ' ' + date.getDate() + ', .*'; }
function monthNumber(date) { return date.getFullYear() * 12 + date.getMonth(); }
var saturday = new Date(soccer.starts_at);
var sunday = new Date(saturday); sunday.setDate(sunday.getDate() + 1);
var wednesday = new Date(camp.starts_at); wednesday.setDate(wednesday.getDate() + 2);
output.calendar = {
  soccerName: soccer.name, campName: camp.name,
  saturday: dayLabel(saturday), sunday: dayLabel(sunday), wednesday: dayLabel(wednesday),
  saturdayNextMonth: monthNumber(saturday) > monthNumber(new Date()),
  sundayNextMonth: monthNumber(sunday) > monthNumber(saturday),
  wednesdayNextMonth: monthNumber(wednesday) > monthNumber(sunday),
  wednesdayPreviousMonth: monthNumber(wednesday) < monthNumber(sunday),
};
