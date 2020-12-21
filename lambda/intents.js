const Alexa = require('ask-sdk-core');
const moment=require('moment-timezone')

const SetupRemainderIntent = {
    canHandle(handlerInput) {
         return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'SetupRemainderIntent';
    },
    async handle(handlerInput) {
        const {attributesManager, serviceClientFactory, requestEnvelope} = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const {intent} = requestEnvelope.request;
        
        const {permissions} = requestEnvelope.context.System.user;
        if (!(permissions && permissions.consentToken)){
            return handlerInput.responseBuilder
                .speak("Please allow me to send notifications.")
                .getResponse();
        }
        const reminderServiceClient = serviceClientFactory.getReminderManagementServiceClient();
        
        let hourslot = Alexa.getSlot(requestEnvelope, 'hour');
        let minuteslot = Alexa.getSlot(requestEnvelope, 'minute');
        let afterslot = Alexa.getSlot(requestEnvelope, 'afterbefore')
        
        //console.log(`hour ${JSON.stringify(hourslot)}`);
        //console.log(`minute ${JSON.stringify(minuteslot)}`);
        //console.log(`after ${JSON.stringify(afterslot)}`);
        
        let reminderData;
        let speakout;
        if(hourslot.value){
            const hour=hourslot.value;
            let minute=minuteslot.value?minuteslot.value:0;
            
            const today = moment();
            
            let when=moment();
            when.hour(hour);
            
            when.minute(0);
            if(afterslot.value&&afterslot.value==='before')
                when.subtract(minute,'minutes');
            else
                when.add(minute,'minutes');
            
            if (when.isBefore(today)){          //adding remainder in the past leads to error^[cititation needed]
                when.add(1,'days');
            }
            const message="Your notification";
            
            reminderData = {
                trigger: {
                    type: 'SCHEDULED_ABSOLUTE',
                    scheduledTime: when.format('YYYY-MM-DDTHH:mm:00.000')
                },
                alertInfo: {
                    spokenInfo: {
                        content: [{
                            locale: "en-US",
                            text: message,
                            ssml: `<speak>${message}</speak>`
                        }],
                    },
                },
                pushNotification: {
                    status: "ENABLED"
                }
            };
            
            if(minuteslot.value)
                speakout=`Remainder set at ${minute} ${afterslot.value} ${hour}`;
            else
                speakout=`Remainder set at ${hour} o'clock`;
        } else {
            reminderData = {
                trigger: {
                    type: "SCHEDULED_RELATIVE",
                    offsetInSeconds: "15",
                },
                alertInfo: {
                    spokenInfo: {
                        content: [{
                            locale: "en-US",
                            text: "Your notification message.",
                            ssml: "<speak>Your notification voice.</speak>"
                        }],
                    },
                },
                pushNotification: {
                    status: "ENABLED"
                }
            };
            speakout="Rameinder set, it will fire in 15 seconds!!";
        }
        
        await reminderServiceClient.createReminder(reminderData);
        
        return handlerInput.responseBuilder
            .speak(speakout)
            .getResponse();
    }
};

module.exports={
    SetupRemainderIntent,
};