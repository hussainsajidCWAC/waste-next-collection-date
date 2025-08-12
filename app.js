//Display the error message if data isn't returned properly
const displayError = () => {
    logIntRun()
    
	$('#bin-schedule-content').empty().append('<p>Bin schedule is not available at the moment. Please try again later.</p>')
}

const displayResults = (results, resultKeys) => {
    console.log('Display data: ', performance.now())
    
    let content = ''
    
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    
    //bins dictionary to hold a name and icon link for each bin
    /*const bins = {
        'Empty 180L Domestic': {
            icon: 'https://apps-cheshire-east.s3.amazonaws.com/staging/Waste/Bin-Icons/Black%20Bin.png',
            name: 'Domestic Black Bin 180 litre'
        },
        'Empty Domestic 180l': {
            icon: 'https://apps-cheshire-east.s3.amazonaws.com/staging/Waste/Bin-Icons/Black%20Bin.png',
            name: 'Domestic Black Bin 180 litre'
        },
        'Empty 240L Garden': {
            icon: 'https://apps-cheshire-east.s3.amazonaws.com/staging/Waste/Bin-Icons/Green%20Bin.png',
            name: 'Garden Green Bin 240 litre'
        },
        'Empty Recycling': {
            icon: 'https://apps-cheshire-east.s3.amazonaws.com/staging/confirm/map-icons/lamp-on',
            name: 'Recycling*'
        },
        'Empty 180L Blue': {
            icon: 'https://apps-cheshire-east.s3.amazonaws.com/staging/Waste/Bin-Icons/Black%20Bin_Blue%20Lid.png',
            name: '180L Blue*'
        },
        'Empty 180L Red': {
            icon: 'https://apps-cheshire-east.s3.amazonaws.com/staging/Waste/Bin-Icons/Black%20Bin_Red%20Lid.png',
            name: '180L Red*'
        },
        'Empty Green Box 55L': {
            icon: 'https://apps-cheshire-east.s3.amazonaws.com/staging/Waste/Bin-Icons/Green%20Box.png',
            name: 'Green Box 55 litre'
        },
        'Empty 23L Caddy': {
            icon: 'https://apps-cheshire-east.s3.amazonaws.com/staging/Waste/Bin-Icons/Food%20Caddy.png',
            name: 'Brown Food Caddy 23 litre (Outside Kitchen)'
        },
        'Empty Black Sacks': {
            icon: 'https://apps-cheshire-east.s3.amazonaws.com/staging/confirm/map-icons/lamp-on',
            name: 'Black Sacks'
        }
    }*/
    
    const icons = {
        'Domestic': 'https://apps-cheshire-east.s3.amazonaws.com/staging/Waste/service-icons/domestic.png',
        'Recycling': 'https://apps-cheshire-east.s3.amazonaws.com/staging/Waste/service-icons/recycling.png',
        'Garden': 'https://apps-cheshire-east.s3.amazonaws.com/staging/Waste/service-icons/garden.png',
        'Food': 'https://apps-cheshire-east.s3.amazonaws.com/staging/Waste/service-icons/food.png'
    }

    content += '<div class="bin-schedule-content-service-card"><h3>Your collection schedule</h3>'
    
    for (let a in resultKeys) {
        let i = resultKeys[a][0]
        
        /*let header = false
        
        for (a in results[i].services) {
            const service = results[i].services[a]
            
            if (service.hasOwnProperty('nextCollectionDate')) {
                
                //Adds a head only if there isnt a header
                if (!header) {
                    content += '<div class="bin-schedule-content-service-card"><h3>' + i + '</h3>'
                    header = true
                }
                
                const nextCollectionDate = service.nextCollectionDate.toLocaleDateString(undefined, options)
                
                let name = ''
                let icon = ''
                
                //Placeholder icon and default name for unknown containers
                if (bins.hasOwnProperty(service.name)) {
                    name = bins[service.name].name
                    icon = bins[service.name].icon
                } else {
                    name = service.name.replace('Empty ', '') + '*'
                    icon = 'https://apps-cheshire-east.s3.amazonaws.com/staging/confirm/map-icons/lamp-on'
                }
                
                content += '<div class="bin-schedule-content-bin-card">'
                content += '<img src="' + icon + '" alt="' + name + ' icon">'
                content += '<div class="bin-schedule-content-info"><p>' + name + '</p><p>Next collection: ' + nextCollectionDate + '</p></div>'
                content += '</div>'
            }

        }*/
        const service = results[i]
        
        if (service.hasOwnProperty('nextCollectionDate')) {
            
            const nextCollectionDate = service.nextCollectionDate.toLocaleDateString(undefined, options)
            
            let icon = ''
            
            //Placeholder icon for unknown services
            if (icons.hasOwnProperty(i)) {
                icon = icons[i]
            } else {
                icon = 'https://apps-cheshire-east.s3.amazonaws.com/staging/confirm/map-icons/lamp-on'
            }
            
            content += '<div class="bin-schedule-content-bin-card">'
            content += '<img src="' + icon + '" alt="' + i + ' icon">'
            content += '<div class="bin-schedule-content-info"><p>' + i + '</p><p>Next collection: ' + nextCollectionDate + '</p></div>'
            content += '</div>'
        }
    }
        
    content += '</div>'
    
    
    $('input[name="loading"]')[0].value = 'False'
    $('input[name="loading"]').trigger('input')
        
    $('#bin-schedule-content').empty().append(content)
    
    console.log('Done: ', performance.now())
}

//goes through the data returned from each integration and finds the relevant data
const sortResults = (featuresScheduleGetResponse, jobsGetResponse, premisesAttributeGetResponse) => {
    console.log('Filter data: ', performance.now())
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
        
        for (a in results[i].services) {
            const type = results[i].services[a].name
            
            for (b in results[i].services[a].rounds) {
                const round = results[i].services[a].rounds[b]
                
                for (c in jobsGetResponse) {
                    
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
    
    //Sort the data by collection date and removes services without next collectiondate
    /*for (let i in results) {
        results[i].services = results[i].services.filter(function( obj ) {
            return obj.hasOwnProperty('nextCollectionDate')
        })
        
        results[i].services.sort((a,b) => (a.nextCollectionDate > b.nextCollectionDate) ? 1 : ((b.nextCollectionDate > a.nextCollectionDate) ? -1 : 0))
        
        resultKeys.push([i, results[i].services[0].nextCollectionDate])
    }*/
    
    /*results = results.filter(function( obj ) {
        return obj.hasOwnProperty('nextCollectionDate')
    })
    
    results.sort((a,b) => (a.nextCollectionDate > b.nextCollectionDate) ? 1 : ((b.nextCollectionDate > a.nextCollectionDate) ? -1 : 0))
    
    resultKeys.push([0, results[0].nextCollectionDate])*/
    
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
    
    const weekdayList = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
    
    let roundName = '' 
    
    //use the most common collection day and round letter to populate the round token
    if (roundLetter !== '') {
        $('input[name="round"]')[0].value = weekdayList[mode(collectionDays)] + ' ' + roundLetter
        $('input[name="round"]').trigger('input')
    }
    
    displayResults(results, resultKeys)
}


//checks if data has returned from all integration before working on them
const checkData = (featuresScheduleGetResponse, jobsGetResponse, premisesAttributeGetResponse) => {
	if (featuresScheduleGetResponse.hasRan && jobsGetResponse.hasRan && premisesAttributeGetResponse.hasRan) {
	    if (featuresScheduleGetResponse.success && jobsGetResponse.success && premisesAttributeGetResponse.success) {
	        sortResults(featuresScheduleGetResponse.data, jobsGetResponse.data, premisesAttributeGetResponse.data)
	    } else {
	        displayError()
	    }
	}
}

//runs all the relevant integration to retreive the data
const getBins = () => {
    console.log('Collection and round information get: ', performance.now())
    payload = {
        "UPRN": {
            "name": "UPRN",
            "value": UPRN
        },
        "AuthenticateResponse": {
            "name": "AuthenticateResponse",
            "value": AuthenticateResponse
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
        checkData(response1, response2, response3)
    })
    runLookup('6101d23110243', payload).then((response) => {
        cacheIntRun('Bartec - binsubform - Jobs_Get')
        response2 = response
        checkData(response1, response2, response3)
    })
    runLookup('6101d1ec57644', payload).then((response) => {
        cacheIntRun('Bartec - binsubform - Premises_Attributes_Get')
        response3 = response
        checkData(response1, response2, response3)
    })
}

//checks and gets the authentication token
const getAuthenticateResponse = () => {
    console.log('Authentication token get: ', performance.now())
    
    if (AuthenticateResponse == '') {
		runLookup('609b918c7dd6d').then((response) => {
			cacheIntRun('Bartec - get authenticate token')
			
            if (response.success) {
                AuthenticateResponse = response.data[0].AuthenticateResponse
			    getBins()
            } else {
                displayError()
            }
		})
    } else {
        getBins()
    }
}

const checkChange = () => {
    if ($('input[name="binUPRN"]')[0].value !== '' && $('input[name="binUPRN"]')[0].value !== UPRN) {
        console.log('UPRN change: ', performance.now())
        
        UPRN = $('input[name="binUPRN"]')[0].value
        
        //adds a message to show the customer to wait
        $('#bin-schedule-content').empty()
        $('input[name="loading"]')[0].value = 'True'
        $('input[name="loading"]').trigger('input')
        
        $('input[name="round"]')[0].value = ''
        $('input[name="round"]').trigger('input')
        
        getAuthenticateResponse()
    } else if ($('input[name="binUPRN"]')[0].value === '') {
        //removes the information
        $('#bin-schedule-content').empty()
        $('input[name="loading"]')[0].value = 'False'
        $('input[name="loading"]').trigger('input')
        
        $('input[name="round"]')[0].value = ''
        $('input[name="round"]').trigger('input')
    }
}

const getIntegrationScript = () => {
    //code for running integration
    $.getScript("https://gitcdn.link/cdn/digitalteam-Qwest/run-lookup/main/app.js").done(
        scriptLoaded = true,
        checkChange()
    )
}

//runs when the binUPRN token changes
$('input[name="binUPRN"]').change(() => {
    if (scriptLoaded) {
        checkChange()
    } else {
        getIntegrationScript()
    }
})

let payload = {}
let AuthenticateResponse = ''
let lookupStatus = true

let UPRN = ''

let scriptLoaded = false
