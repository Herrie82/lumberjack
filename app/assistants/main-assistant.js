function MainAssistant()
{
    // subtitle random list
    this.randomSub = 
	[
		{weight: 30, text: $L('Always Watching The Log')},
		{weight: 20, text: $L('Sleep All Night, Work All Day')},
		{weight: 10, text: $L('I\'m OK')},
		{weight: 1,  text: $L('Is A Logger... Get it?')}
	];
	
    // setup menu
    this.menuModel =
    {
		visible: true,
		items:
		[
			{
				label: $L("Preferences"),
				command: 'do-prefs'
			},
			{
				label: $L("Help"),
				command: 'do-help'
			}
		]
    };
}

MainAssistant.prototype.setup = function()
{
	
    // set theme because this can be the first scene pushed
    this.controller.document.body.className = prefs.get().theme;
	
	
    this.controller.get('main-title').innerHTML = $L('Lumberjack');
    this.controller.get('version').innerHTML = $L('v0.0.0');
    this.controller.get('subTitle').innerHTML = $L('');	

    // setup menu
    this.controller.setupWidget(Mojo.Menu.appMenu, { omitDefaultItems: true }, this.menuModel);
	
    // get elements
    this.versionElement = 	this.controller.get('version');
    this.subTitleElement =	this.controller.get('subTitle');
	this.toShowElement =	this.controller.get('toShow');
	this.tailRow =			this.controller.get('tailRow');
	
    this.versionElement.innerHTML = "v" + Mojo.Controller.appInfo.version;
    this.subTitleElement.innerHTML = this.getRandomSubTitle();

    // handlers
    this.listAppsHandler =		this.listApps.bindAsEventListener(this);
    this.tailRowTapHandler =	this.tailRowTap.bindAsEventListener(this);
	
	this.controller.setupWidget
	(
		'toShow',
		{
			label: $L('Log')
		},
		this.toShowModel =
		{
			value: 'all',
			choices: 
			[
				{label:'Special'},
				{label:$L('All Apps'), value:'all'},
				{label:$L('Alert()s'), value:'alert'}
			]
		}
	);
	
	this.controller.listen(this.tailRow, Mojo.Event.tap, this.tailRowTapHandler);
	
	this.request = LumberjackService.listApps(this.listAppsHandler);
};

MainAssistant.prototype.listApps = function(payload)
{
	if (payload.apps.length > 0)
	{
		payload.apps.sort(function(a, b)
		{
			if (a.title && b.title)
			{
				strA = a.title.toLowerCase();
				strB = b.title.toLowerCase();
				return ((strA < strB) ? -1 : ((strA > strB) ? 1 : 0));
			}
			else
			{
				return -1;
			}
		});
		
		this.toShowModel.choices.push({label:'Applications'});
		for (var a = 0; a < payload.apps.length; a++)
		{
			this.toShowModel.choices.push({label:payload.apps[a].title+' <i>v'+payload.apps[a].version+'</i>', value:payload.apps[a].id});
		}
	}
	this.controller.modelChanged(this.toShowModel);
};

MainAssistant.prototype.tailRowTap = function(event)
{
	this.controller.stageController.pushScene('tail-log', this.toShowModel.value);
};
    
MainAssistant.prototype.getRandomSubTitle = function()
{
	// loop to get total weight value
	var weight = 0;
	for (var r = 0; r < this.randomSub.length; r++)
	{
		weight += this.randomSub[r].weight;
	}
	
	// random weighted value
	var rand = Math.floor(Math.random() * weight);
	//alert('rand: ' + rand + ' of ' + weight);
	
	// loop through to find the random title
	for (var r = 0; r < this.randomSub.length; r++)
	{
		if (rand <= this.randomSub[r].weight)
		{
			return this.randomSub[r].text;
		}
		else
		{
			rand -= this.randomSub[r].weight;
		}
	}
	
	// if no random title was found (for whatever reason, wtf?) return first and best subtitle
	return this.randomSub[0].text;
}

MainAssistant.prototype.handleCommand = function(event)
{
	if (event.type == Mojo.Event.command)
	{
		switch (event.command)
		{
			case 'do-prefs':
				this.controller.stageController.pushScene('preferences');
				break;
	
			case 'do-help':
				this.controller.stageController.pushScene('help');
				break;
		}
	}
}

MainAssistant.prototype.activate = function(event)
{
	if (this.controller.stageController.setWindowOrientation)
	{
    	this.controller.stageController.setWindowOrientation("up");
	}
};
MainAssistant.prototype.deactivate = function(event)
{
};

MainAssistant.prototype.cleanup = function(event)
{
	this.controller.stopListening(this.tailRow, Mojo.Event.tap, this.tailRowTapHandler);
};
