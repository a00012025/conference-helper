/* global chrome */
import React from 'react';
import { Button, TextField, FormLabel } from '@material-ui/core';
import moment from 'moment';
import './App.css';

const RFC_3339 = 'YYYY-MM-DDTHH:mm:ss';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      confName: '',
      confLoc: '',
      confStart: '',
      confEnd: '',
      confUrl: '',
      addingToCalendar: false,
      addToCalendarSuccess: null,
    };
    this.loadConfInfoFromStorage();
    this.token = null;
  }

  saveToStorage() {
    const {
      confName, confStart, confEnd, confLoc, confUrl,
    } = this.state;
    chrome.storage.sync.set({
      confName, confStart, confEnd, confLoc, confUrl,
    });
  }

  loadConfInfoFromStorage() {
    chrome.storage.sync.get([
      'confName', 'confLoc', 'confStart', 'confEnd', 'confUrl',
    ], (items) => {
      this.setState(items);
    });
  }

  updateInfo() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.executeScript(
        tabs[0].id,
        { code: "a=Array.from(document.getElementsByTagName('a')).filter((a) => a.innerText == 'Add To Calendar' || a.innerText == '加入行事曆')[0]; [a?a.href:null, document.title]" },
        (results) => {
          if (results[0][0]) {
            console.log(results[0][0]);
            const url = results[0][0].toString();
            const param_map = {};
            url.slice(38).split('&').forEach((part) => {
              const [key, value] = part.split('=');
              param_map[key] = value;
            });
            const [confStart, confEnd] = decodeURIComponent(param_map.dates).split('/');
            this.setState({
              confName: decodeURIComponent(`[%E5%A0%B1] ${param_map.text}`),
              confLoc: decodeURIComponent(param_map.location),
              confStart: moment(confStart).format(RFC_3339),
              confEnd: moment(confEnd).format(RFC_3339),
            }, this.saveToStorage);
          } else {
            this.setState({
              confName: `[報] ${results[0][1].toString()}`,
            }, this.saveToStorage);
          }
        },
      );
      chrome.tabs.executeScript(
        tabs[0].id,
        { code: 'document.URL' },
        (result) => {
          this.setState({
            confUrl: result.toString(),
          }, this.saveToStorage);
        },
      );
    });
  }

  addToCalendar() {
    const {
      confName, confStart, confEnd, confLoc, confUrl,
    } = this.state;
    this.setState({
      addingToCalendar: true,
      addToCalendarSuccess: false,
    });
    const calendarId = 'skysource.com.tw_kpdpd59au73r6ad55ercjnuoq4@group.calendar.google.com';
    const postUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`;
    const postParams = {
      headers: new Headers({
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      }),
      method: 'POST',
      body: JSON.stringify({
        summary: confName,
        start: {
          dateTime: moment(confStart).format(),
        },
        end: {
          dateTime: moment(confEnd).format(),
        },
        location: confLoc,
        description: confUrl,
      }),
    };
    fetch(postUrl, postParams)
      .then((response) => {
        this.setState({
          addingToCalendar: false,
          addToCalendarSuccess: !response.error,
        });
        if (response.error) {
          throw response.error;
        } else {
          return response;
        }
      })
      .catch(console.error);
  }

  componentDidMount() {
    chrome.identity.getAuthToken({ interactive: true }, (t) => {
      this.token = t;
    });
  }

  render() {
    const handleChange = (event) => {
      const { id: key, value } = event.target;
      this.setState({ [key]: value }, this.saveToStorage);
    };
    const {
      confName, confStart, confEnd, confLoc, confUrl, addingToCalendar, addToCalendarSuccess,
    } = this.state;
    return (
      <div className="App">
        <header />
        <body className="App-body">
          <form>
            <TextField
              id="confName"
              label="Conference name"
              multiline
              rowsMax="4"
              value={confName}
              onChange={handleChange}
              margin="normal"
            />
            <TextField
              id="confLoc"
              label="Location"
              multiline
              rowsMax="4"
              value={confLoc}
              onChange={handleChange}
              margin="normal"
            />
            <TextField
              id="confStart"
              label="Start Time"
              type="datetime-local"
              value={confStart}
              onChange={handleChange}
              InputLabelProps={{
                shrink: true,
              }}
              margin="normal"
            />
            <TextField
              id="confEnd"
              label="End Time"
              type="datetime-local"
              value={confEnd}
              onChange={handleChange}
              InputLabelProps={{
                shrink: true,
              }}
              margin="normal"
            />
            <TextField
              id="confUrl"
              label="URL"
              multiline
              rowsMax="4"
              value={confUrl}
              onChange={handleChange}
              margin="normal"
            />
          </form>
          <Button
            variant="contained"
            color="default"
            onClick={() => { this.updateInfo(); }}
            margin="normal"
          >
            Parse Info
          </Button>
          <Button
            variant="contained"
            color="primary"
            disabled={addingToCalendar}
            onClick={() => { this.addToCalendar(); }}
            margin="normal"
          >
            Add to calendar
          </Button>
          {addToCalendarSuccess && <FormLabel margin="normal">Success!</FormLabel> }
        </body>
      </div>
    );
  }
}

export default App;
