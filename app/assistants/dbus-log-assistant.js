function DbusLogAssistant(filter, popped)
{
	this.autoScroll =	true;
	
	this.filter =		(filter.filter ? filter.filter : 'allapps');
	this.custom =		(filter.custom ? filter.custom : '');
	this.popped =		popped;
	
	this.unregister =	true;
	
	this.showBanners =	false;
	
	this.copyStart =	-1;
	
    this.isVisible =	true;
    this.lastFocusMarker =	false;
    this.lastFocusMessage =	false;
	
	// setup menu
	this.menuModel =
	{
		visible: true,
		items: []
	}
	
}

DbusLogAssistant.prototype.setup = function()
{
	try
	{
	    // set theme because this can be the first scene pushed
    	this.controller.document.body.className = prefs.get().theme + ' ' + prefs.get().fontSize;
		
		// setup menu
        this.updateAppMenu(true);
		this.controller.setupWidget(Mojo.Menu.appMenu, { omitDefaultItems: true }, this.menuModel);
		
        this.documentElement =			this.controller.stageController.document;
		this.sceneScroller =			this.controller.sceneScroller;
		this.titleElement =				this.controller.get('dbus-log-title');
		this.messagesElement =			this.controller.get('messages');
		this.followToggle = 			this.controller.get('followToggle');
		this.popButtonElement =			this.controller.get('popButton');
		this.scrollHandler =			this.onScrollStarted.bindAsEventListener(this);
        this.visibleWindowHandler =		this.visibleWindow.bindAsEventListener(this);
        this.invisibleWindowHandler =	this.invisibleWindow.bindAsEventListener(this);
		this.toggleChangeHandler =		this.toggleChanged.bindAsEventListener(this);
		this.popButtonPressed =			this.popButtonPressed.bindAsEventListener(this);
		this.messageTapHandler =		this.messageTap.bindAsEventListener(this);
		
		Mojo.Event.listen(this.sceneScroller, Mojo.Event.scrollStarting, this.scrollHandler);
        Mojo.Event.listen(this.documentElement, Mojo.Event.stageActivate, this.visibleWindowHandler);
        Mojo.Event.listen(this.documentElement, Mojo.Event.stageDeactivate, this.invisibleWindowHandler);
		
		switch(this.filter)
		{
			case 'allapps':	this.titleElement.update('All Applications'); break;
			case 'every':	this.titleElement.update('Everything'); break;
			case 'custom':	this.titleElement.update('Custom'); break;
			default:		this.titleElement.update((appsList.get(this.filter) ? appsList.get(this.filter) : this.filter)); break;
		}
		
		if (this.popped)
		{
			this.popButtonElement.style.display = 'none';
			this.titleElement.style.width = '200px';
		}
		else
		{
			this.controller.listen(this.popButtonElement, Mojo.Event.tap, this.popButtonPressed);
			this.followToggle.style.right = '16px';
		}
		
		this.controller.setupWidget
		(
			'followToggle',
			{
	  			trueLabel:  'on',  // follow
	 			falseLabel: 'off', // stopped
			},
			this.followToggleModel = { value: false }
		);
		
		this.controller.listen('followToggle', Mojo.Event.propertyChange, this.toggleChangeHandler);
		
		
		this.controller.setupWidget
		(
			'messages',
			{
				itemTemplate: "log/dbus-row",
				swipeToDelete: false,
				reorderable: false,
				renderLimit: 50,
			},
			this.listModel =
			{
				items: []
			}
		);
		this.revealBottom();
		
		this.controller.listen(this.messagesElement, Mojo.Event.listTap, this.messageTapHandler);
		
		// register scene!
		dbus.registerScene(this.filter, this);
		
	}
	catch (e)
	{
		Mojo.Log.logException(e, 'dbus-log#setup');
	}
}

DbusLogAssistant.prototype.toggleChanged = function(event)
{
	if (event.value)
	{
		this.start();
	}
	else
	{
		this.stop();
	}
}
DbusLogAssistant.prototype.popButtonPressed = function(event)
{
	this.unregister = false;
	dbus.newScene(this, {filter: this.filter, custom: this.custom}, true);
	this.controller.stageController.popScene();
}

DbusLogAssistant.prototype.messageTap = function(event)
{
	if (event.item)
	{
		var popupList = [];
		if (this.copyStart > -1)
		{
			popupList.push({label: 'Copy',				command: 'copy'});
			if (this.copyStart == event.index)
			{
				this.copyStart = -1;
				popupList.push({label: 'Copy From Here',	command: 'copy-from'});
			}
			else
			{
				popupList.push({label: '... To Here',		command: 'copy-to'});
			}
		}
		else
		{
			popupList.push({label: 'Copy',				command: 'copy'});
			popupList.push({label: 'Copy From Here',	command: 'copy-from'});
		}
		
		this.controller.popupSubmenu(
		{
			onChoose: this.messageTapListHandler.bindAsEventListener(this, event.item, event.index),
			popupClass: 'group-popup',
			placeNear: event.originalEvent.target,
			items: popupList
		});
	}
}
DbusLogAssistant.prototype.messageTapListHandler = function(choice, item, index)
{
	switch(choice)
	{
		case 'copy':
			copyLog((prefs.get().copyStyle == 'clean' ? item.copy : item.raw), this);
			this.copyStart = -1;
			this.messageHighlight(-1);
			break;
			
		case 'copy-from':
			this.messageHighlight(index);
			this.copyStart = index;
			break;
			
		case 'copy-to':
			if (this.listModel.items.length > 0)
			{
				var message = '';
				
				var start = (this.copyStart > index ? index : this.copyStart);
				var end   = (this.copyStart < index ? index : this.copyStart);
				
				for (var i = start; i <= end; i++)
				{
					if (message != '') message += '\n';
					message += (prefs.get().copyStyle == 'clean' ? this.listModel.items[i].copy : this.listModel.items[i].raw);
				}
				if (message != '')
				{
					copyLog(message, this);
				}
			}
			this.copyStart = -1;
			this.messageHighlight(-1);
			break;
	}
}
DbusLogAssistant.prototype.messageHighlight = function(index)
{
	if (this.listModel.items.length > 0)
	{
		for (var i = 0; i < this.listModel.items.length; i++)
		{
			if (i == index)
				this.listModel.items[i].select = 'selected';
			else
				this.listModel.items[i].select = '';
		}
		this.messagesElement.mojo.noticeUpdatedItems(0, this.listModel.items);
		this.messagesElement.mojo.setLength(this.listModel.items.length);
	}
}

DbusLogAssistant.prototype.start = function()
{
	dbus.startScene(this.filter);
	
	this.followToggleModel.value = true;
	this.controller.modelChanged(this.followToggleModel);
}
DbusLogAssistant.prototype.addMessage = function(theMsg)
{
	if (theMsg)
	{
		var push = true;
		var msg = Object.clone(theMsg);
		msg.select = '';
		if (this.filter == 'custom')
		{
			push = false;
			if (msg.raw.include(this.custom)) push = true;
		}
		if (push)
		{
			this.listModel.items.push(msg);
			var start = this.messagesElement.mojo.getLength();
			this.messagesElement.mojo.noticeUpdatedItems(start, [msg]);
			this.messagesElement.mojo.setLength(start + 1);
			this.revealBottom();
			
			if (!this.isVisible && this.lastFocusMessage && !this.lastFocusMessage.hasClassName('lostFocus'))
			{
				if (this.lastFocusMarker && this.lastFocusMarker.hasClassName('lostFocus'))
				{
					this.lastFocusMarker.removeClassName('lostFocus');
					this.lastFocusMarker = false;
				}
				this.lastFocusMessage.addClassName('lostFocus');
	        }
			
			if (!this.isVisible && this.showBanners)
			{
				Mojo.Controller.appController.removeBanner('dbus-log-message');
				Mojo.Controller.getAppController().showBanner({messageText: theMsg.type+': '+theMsg.message, icon: 'icon.png'}, {source: 'dbus-log-message', log: this.filter});
			}
		}
	}
}
DbusLogAssistant.prototype.stop = function()
{
	dbus.stopScene(this.filter);
}
DbusLogAssistant.prototype.stopped = function()
{
	if (this.controller)
	{
		this.followToggleModel.value = false;
		this.controller.modelChanged(this.followToggleModel);
	}
}

DbusLogAssistant.prototype.onScrollStarted = function(event)
{
	event.addListener(this);
}
DbusLogAssistant.prototype.moved = function(stopped, position)
{
	if (this.sceneScroller.scrollHeight - this.sceneScroller.scrollTop > this.sceneScroller.clientHeight) 
	{
		this.autoScroll = false;
	}
	else
	{
		this.autoScroll = true;
	}
}
DbusLogAssistant.prototype.revealBottom = function()
{
	if (this.autoScroll) 
	{
		//var height = this.inputContainerElement.clientHeight;
		//this.messageListElement.style.paddingBottom = height + 'px';
		
		// palm does this twice in the messaging app to make sure it always reveals the very very bottom
		this.sceneScroller.mojo.revealBottom();
		this.sceneScroller.mojo.revealBottom();
	}
}

DbusLogAssistant.prototype.visibleWindow = function(event)
{
	Mojo.Controller.appController.removeBanner('dbus-log-message');
    if (!this.isVisible)
	{
        this.isVisible = true;
    }
}
DbusLogAssistant.prototype.invisibleWindow = function(event)
{
    this.isVisible = false;
    if (this.lastFocusMessage && this.lastFocusMessage.hasClassName('lostFocus'))
	{
        this.lastFocusMarker = this.lastFocusMessage;
    }
    this.lastFocusMessage = this.messagesElement.mojo.getNodeByIndex(this.messagesElement.mojo.getLength() - 1);
}


DbusLogAssistant.prototype.updateAppMenu = function(skipUpdate)
{
    this.menuModel.items = [];
    
	/*
	if (this.showBanners)
	{
		this.menuModel.items.push({
			label: $L('Show Banners'),
			secondaryIcon: 'box checked',
			command: 'do-banner-off'
		});
	}
	else
	{
		this.menuModel.items.push({
			label: $L('Show Banners'),
			secondaryIcon: 'box',
			command: 'do-banner-on'
		});
	}
	*/
	
	this.menuModel.items.push({
		label: $L("Clear Screen"),
		command: 'do-clear'
	});
	
	this.menuModel.items.push({
		label: $L("Log"),
		items: [
			{label:$L('Email'),		command:'do-log-email'},
			{label:$L('Copy'),		command:'do-log-copy'}
		]
	});
	
	this.menuModel.items.push({
		label: $L("Help"),
		command: 'do-help'
	});
    
    if (!skipUpdate)
	{
        this.controller.modelChanged(this.menuModel);
    }
}


DbusLogAssistant.prototype.errorMessage = function(msg)
{
	this.controller.showAlertDialog(
	{
		allowHTMLMessage:	true,
		preventCancel:		true,
	    title:				'Lumberjack',
	    message:			msg,
	    choices:			[{label:$L("Ok"), value:'ok'}],
	    onChoose:			function(e){}
    });
}


DbusLogAssistant.prototype.handleCommand = function(event)
{
	if (event.type == Mojo.Event.command)
	{
		switch (event.command)
		{
			case 'do-banner-on':
				this.showBanners = true;
				this.updateAppMenu();
				break;
				
			case 'do-banner-off':
				this.showBanners = false;
				this.updateAppMenu();
				break;
				
			case 'do-clear':
			    this.lastFocusMarker =	false;
			    this.lastFocusMessage =	false;
				this.listModel.items = [];
				this.messagesElement.mojo.setLength(0);
				this.revealBottom();
				break;
			
			case 'do-help':
				this.controller.stageController.pushScene('help');
				break;
			
			case 'do-log-email':
				var text = 'Here is the log from ' + this.titleElement.innerText +':<br /><br />';
				for(var i = 0; i < this.listModel.items.length; i++)
					text += formatForHtml(prefs.get().copyStyle == 'clean' ? this.listModel.items[i].copy : this.listModel.items[i].raw) + '<br />';
				email('Log for ' + this.titleElement.innerText, text);
			break;
			case 'do-log-copy':
				for(var i = 0; i < this.listModel.items.length; i++)
					text += (prefs.get().copyStyle == 'clean' ? this.listModel.items[i].copy : this.listModel.items[i].raw) + "\n";
				copyLog(text, this);
			break;
		}
	}
}

DbusLogAssistant.prototype.orientationChanged = function(orientation)
{
	this.revealBottom();
}
DbusLogAssistant.prototype.activate = function(event)
{
	Mojo.Controller.appController.removeBanner('dbus-log-message');
	if (!this.alreadyActivated)
	{
		this.start();
	}
	
	if (this.controller.stageController.setWindowOrientation)
	{
    	this.controller.stageController.setWindowOrientation("free");
	}
	
	this.alreadyActivated = true;
}

DbusLogAssistant.prototype.deactivate = function(event) {}
DbusLogAssistant.prototype.cleanup = function(event)
{
	// unregister scene!
	if (this.unregister)
		dbus.unregisterScene(this.filter);
}
