class binWidget {
    constructor(UPRN) {
        this.AuthenticateResponse = ''
        this.UPRN = UPRN
    }

    start () {
        console.log('started')
        if (this.UPRN === '') {
            $('#bin-schedule-content').empty()
            return
        }

        $('#bin-schedule-content').empty().append('<p>Retrieving information...</p>')

        this.getAuthenticateResponse()
    }

    //checks and gets the authentication token
    getAuthenticateResponse () {
        console.log('authenticate token')
        if (this.AuthenticateResponse === '') {
            runLookup('609b918c7dd6d').then((response) => {
                cacheIntRun('Bartec - get authenticate token')
                
                if (response.success) {
                    this.AuthenticateResponse = response.data[0].AuthenticateResponse
                    this.getBins()
                } else {
                    this.displayError()
                }
            })
        } else {
            this.getBins()
        }
    }

    //runs all the relevant integration to retreive the data
    getBins () {
        console.log('getting bins')
        const payload = {
            "UPRN": {
                "name": "UPRN",
                "value": this.UPRN
            },
            "AuthenticateResponse": {
                "name": "AuthenticateResponse",
                "value": this.AuthenticateResponse
            }
        }
        
        const template = {
            hasRan: false,
            success: false,
            data: ''
        }
        
        let response1 = Object.create(template)
        let response2 = Object.create(template)
        let response3 = Object.create(template)
        
        //run each integration and check if all the data is returned
        runLookup('6101d1a29ba09', payload).then((response) => {
            cacheIntRun('Bartec - binsubform - Features_Schedules_Get')
            response1 = response
            this.checkData(response1, response2, response3)
        })
        runLookup('6101d23110243', payload).then((response) => {
            cacheIntRun('Bartec - binsubform - Jobs_Get')
            response2 = response
            this.checkData(response1, response2, response3)
        })
        runLookup('6101d1ec57644', payload).then((response) => {
            cacheIntRun('Bartec - binsubform - Premises_Attributes_Get')
            response3 = response
            this.checkData(response1, response2, response3)
        })
    }

    //checks if data has returned from all integration before working on them
    checkData (featuresScheduleGetResponse, jobsGetResponse, premisesAttributeGetResponse) {
        console.log('checking data')
        if (featuresScheduleGetResponse.hasRan && jobsGetResponse.hasRan && premisesAttributeGetResponse.hasRan) {
            if (featuresScheduleGetResponse.success && jobsGetResponse.success && premisesAttributeGetResponse.success) {
                this.sortResults(featuresScheduleGetResponse.data, jobsGetResponse.data, premisesAttributeGetResponse.data)
            } else {
                this.displayError()
            }
        }
    }

    //goes through the data returned from each integration and finds the relevant data
    sortResults (featuresScheduleGetResponse, jobsGetResponse, premisesAttributeGetResponse) {
        console.log('sorted results')
        //save the integrations log in the db 
        logIntRun()
        
        //converts the date into yyyy-mm-dd format
        const formatDate = (date) => {
            var d = new Date(date),
                month = '' + (d.getMonth() + 1),
                day = '' + d.getDate(),
                year = d.getFullYear();
        
            if (month.length < 2) 
                month = '0' + month;
            if (day.length < 2) 
                day = '0' + day;
        
            return [year, month, day].join('-');
        }
        
        //gets the most common value in an array
        const mode = (arr) => {
            return arr.sort((a,b) =>
                arr.filter(v => v===a).length
                - arr.filter(v => v===b).length
            ).pop();
        }
        
        
        let results = {}
        
        //add each waste container service into the results object
        for (let item in featuresScheduleGetResponse) {
            if (featuresScheduleGetResponse[item].type === 'WASTE CONTAINER') {
                
                const currentService = featuresScheduleGetResponse[item]
                
                //Add service if not exists
                if(!results.hasOwnProperty(currentService.service)){
                    results[currentService.service] = {
                        services: []
                    }
                }

                //Add round type if not exists or add the round to existing round type
                if (!results[currentService.service].services.some(e => e.name === currentService.serviceType)) {
                    results[currentService.service].services.push({
                        name: currentService.serviceType,
                        rounds: [currentService.Round]
                    })
                } else if (results[currentService.service].services.some(e => e.name === currentService.serviceType)) {
                    for (let i in results[currentService.service].services) {
                        if (results[currentService.service].services[i].name === currentService.serviceType) {
                            results[currentService.service].services[i].rounds.push(currentService.Round)
                            break
                        }
                    }
                }

            }
        }
        
        
        //holds the weekdays of each collection
        let collectionDays = []
        
        let today = new Date()
        today.setHours(0,0,0,0)
        
        
        //add each jobs into the appropriate section in the result object
        for (let i in results) {
            
            for (let a in results[i].services) {
                const type = results[i].services[a].name
                
                for (let b in results[i].services[a].rounds) {
                    const round = results[i].services[a].rounds[b]
                    
                    for (let c in jobsGetResponse) {
                        
                        //checks if the current job matches the current round
                        if (jobsGetResponse[c].round.includes(round) && jobsGetResponse[c].serviceType === type) {
                            const currentJobDate = new Date(formatDate(jobsGetResponse[c].collectionDateTime))
                            
                            collectionDays.push(currentJobDate.getDay())
                            
                            //sets the next collection date
                            if (currentJobDate >= today) {
                                /*if (!results[i].services[a].hasOwnProperty('nextCollectionDate')) {
                                    results[i].services[a].nextCollectionDate = currentJobDate
                                } else if (results[i].services[a].nextCollectionDate > currentJobDate) {
                                    results[i].services[a].nextCollectionDate = currentJobDate
                                }*/
                                if (!results[i].hasOwnProperty('nextCollectionDate')) {
                                    results[i].nextCollectionDate = currentJobDate
                                } else if (results[i].nextCollectionDate > currentJobDate) {
                                    results[i].nextCollectionDate = currentJobDate
                                }
        
                            }
                            
                        }
                    }
                    
                }
            }
        }
        
        
        let resultKeys = []
        
        for (let i in results) {
            resultKeys.push([i, results[i].nextCollectionDate])
        }
        
        //sort keys in the results object
        resultKeys.sort(function(a,b) {
            return a[1]-b[1]
        })

        let roundLetter = ''
        
        //find the round letter
        for (let i in premisesAttributeGetResponse) {
            if (premisesAttributeGetResponse[i].Name.includes('WEEK')) {
                roundLetter = premisesAttributeGetResponse[i].Name.replace('WEEK ', '')
                break
            }
        }
        
        const weekdayList = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"]
        
        //use the most common collection day and round letter to populate the round token
        const roundName = weekdayList[mode(collectionDays)] + '-' + roundLetter
        
        this.displayResults(results, resultKeys, roundName)
    }

    displayResults (results, resultKeys, roundName) {
        console.log('displaying results')
        let content = ''
        
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
        
        content += '<div class="bin-schedule-content-service-card">'
        
        for (let a in resultKeys) {
            let i = resultKeys[a][0]
            
            const service = results[i]
            
            if (service.hasOwnProperty('nextCollectionDate')) {
                
                const nextCollectionDate = service.nextCollectionDate.toLocaleDateString(undefined, options)
                
                let icon = ''
                
                if (i.trim() == 'Domestic') {
                    icon = 'https://apps-cheshire-east.s3.amazonaws.com/staging/Waste/service-icons/domestic.png'
                } else if (i.trim() == 'Recycling') {
                    icon = 'https://apps-cheshire-east.s3.amazonaws.com/staging/Waste/service-icons/recycling.png'
                } else if (i.trim() == 'Garden') {
                    icon = 'https://apps-cheshire-east.s3.amazonaws.com/staging/Waste/service-icons/garden.png'
                } else if (i.trim() == 'Food') {
                    icon = 'https://apps-cheshire-east.s3.amazonaws.com/staging/Waste/service-icons/food.png'
                }
                
                content += '<div class="bin-schedule-content-bin-card">'
                content += '<img src="' + icon + '" alt="' + i + ' icon">'
                content += '<div class="bin-schedule-content-info"><p>' + i + '</p><p>Next collection: ' + nextCollectionDate + '</p></div>'
                content += '</div>'
            }
        }

        content += '<p><a target="_blank" href="https://www.cheshirewestandchester.gov.uk/documents/waste-calendars/' + roundName + '.PDF">View your calendar</a></p>'
            
        content += '</div>'
            
        $('#bin-schedule-content').empty().append(content)
    }

    //Display the error message if data isn't returned properly
    displayError () {
        logIntRun()

        $('#bin-schedule-content').empty().append('<p>Bin schedule is not available at the moment. Please try again later.</p>')
    }
}
