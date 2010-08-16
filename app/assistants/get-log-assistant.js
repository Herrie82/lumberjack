function GetLogAssistant(toShow)
{
	this.toShow =		(toShow ? toShow : 'all');
	
	this.request =		false;
	this.contents =		'';
	
	this.copyStart =	-1;
	
	// setup menu
	this.menuModel =
	{
		visible: true,
		items:
		[
			{
				label: $L("Help"),
				command: 'do-help'
			}
		]
	}
	
}

GetLogAssistant.prototype.setup = function()
{
	try
	{
	    // set theme because this can be the first scene pushed
	    this.controller.document.body.className = prefs.get().theme;
		
		// setup menu
		this.controller.setupWidget(Mojo.Menu.appMenu, { omitDefaultItems: true }, this.menuModel);
		
		this.sceneScroller =			this.controller.sceneScroller;
		this.titleElement =				this.controller.get('get-log-title');
		this.messagesElement =			this.controller.get('messages');
		this.reloadButtonElement =		this.controller.get('reloadButton');
		this.spinnerElement =			this.controller.get('spinner');
		this.reloadButtonPressed =		this.reloadButtonPressed.bindAsEventListener(this);
		this.messageTapHandler =		this.messageTap.bindAsEventListener(this);
		
		this.controller.setupWidget('spinner', {spinnerSize: 'large'}, {spinning: false});
		
		if (this.toShow == 'all')
		{
			this.titleElement.update('All Applications');
		}
		else if (this.toShow == 'alert')
		{
			this.titleElement.update('Alert()s');
		}
		else
		{
			this.titleElement.update((appsList.get(this.toShow) ? appsList.get(this.toShow) : this.toShow));
		}
		
		this.controller.listen(this.reloadButtonElement, Mojo.Event.tap, this.reloadButtonPressed);
		
		this.controller.setupWidget
		(
			'messages',
			{
				itemTemplate: "log/message-row",
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
		
	}
	catch (e)
	{
		Mojo.Log.logException(e, 'get-log#setup');
	}
}

GetLogAssistant.prototype.reloadButtonPressed = function(event)
{
	this.get();
}

GetLogAssistant.prototype.messageTap = function(event)
{
	if (event.item)
	{
		var popupList = [];
		if (this.copyStart > -1)
		{
			popupList.push({label: 'Copy This',				command: 'copy-this'});
			popupList.push({label: '... Copy To here',		command: 'copy-to-here'});
		}
		else
		{
			popupList.push({label: 'Copy This',				command: 'copy-this'});
			popupList.push({label: 'Copy From here ...',	command: 'copy-from-here'});
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
GetLogAssistant.prototype.messageTapListHandler = function(choice, item, index)
{
	switch(choice)
	{
		case 'copy-this':
			this.controller.stageController.setClipboard(item.type+': '+item.message);
			this.copyStart = -1;
			break;
			
		case 'copy-from-here':
			this.messageHighlight(index);
			this.copyStart = index;
			break;
			
		case 'copy-to-here':
			if (this.listModel.items.length > 0)
			{
				var message = '';
				for (var i = this.copyStart; i <= index; i++)
				{
					if (message != '') message += '\n';
					message += this.listModel.items[i].type+': '+this.listModel.items[i].message;
				}
				if (message != '')
				{
					this.controller.stageController.setClipboard(message);
				}
			}
			this.copyStart = -1;
			this.messageHighlight(-1);
			break;
	}
}
GetLogAssistant.prototype.messageHighlight = function(index)
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

GetLogAssistant.prototype.get = function()
{
	this.request = LumberjackService.getMessages(this.got.bindAsEventListener(this));
}
GetLogAssistant.prototype.got = function(payload)
{
	if (payload.returnValue)
	{
		switch (payload.stage)
		{
			case 'start':
				this.spinnerElement.mojo.start();
				this.contents = '';
				this.listModel.items = [];
				this.messagesElement.mojo.noticeUpdatedItems(0, this.listModel.items);
				this.messagesElement.mojo.setLength(this.listModel.items.length);
				this.revealBottom();
				break;
				
			case 'middle':
				if (payload.contents) 
				{
					this.contents += payload.contents;
					var position = this.contents.lastIndexOf("\n");
					if (position)
					{
						this.parseMessages(this.contents.substr(0, position));
						this.contents = this.contents.substr(position);
					}
				}
				break;
				
			case 'end':
				if (this.contents != '') 
				{
					this.parseMessages(this.contents);
				}
				this.spinnerElement.mojo.stop();
				this.messagesElement.mojo.noticeUpdatedItems(0, this.listModel.items);
				this.messagesElement.mojo.setLength(this.listModel.items.length);
				this.revealBottom();
				break;
		}
	}
	else
	{
		this.spinnerElement.mojo.stop();
		this.contents = '';
		this.listModel.items = [];
		this.messagesElement.mojo.noticeUpdatedItems(0, this.listModel.items);
		this.messagesElement.mojo.setLength(this.listModel.items.length);
		
		this.errorMessage('<b>Service Error:</b><br>'+payload.errorText);
	}
}
GetLogAssistant.prototype.parseMessages = function(data)
{
	if (data)
	{
		var ary = data.split("\n");
		if (ary.length > 0)
		{
			for (var a = 0; a < ary.length; a++)
			{
				var alertMsg = tailHandler.parseAlert(ary[a]);
				var mojoMsg =  tailHandler.parseMojo(ary[a]);
				if (this.toShow == 'alert')
				{
					this.addMessage(alertMsg);
				}
				else if ((this.toShow == 'all') ||
						(mojoMsg.id && this.toShow.toLowerCase() == mojoMsg.id.toLowerCase()))
				{
					this.addMessage(mojoMsg);
				}
			}
		}
	}
}
GetLogAssistant.prototype.addMessage = function(msg)
{
	if (msg)
	{
		msg.select = '';
		if (this.toShow == 'all') msg.rowClass += ' showapp';
		this.listModel.items.push(msg);
	}
}

GetLogAssistant.prototype.revealBottom = function()
{
	// palm does this twice in the messaging app to make sure it always reveals the very very bottom
	this.sceneScroller.mojo.revealBottom();
	this.sceneScroller.mojo.revealBottom();
}


GetLogAssistant.prototype.errorMessage = function(msg)
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

GetLogAssistant.prototype.handleCommand = function(event)
{
	if (event.type == Mojo.Event.command)
	{
		switch (event.command)
		{
			case 'do-help':
				this.controller.stageController.pushScene('help');
				break;
		}
	}
}

GetLogAssistant.prototype.orientationChanged = function(orientation) {}
GetLogAssistant.prototype.activate = function(event)
{
	if (!this.alreadyActivated)
	{
		this.get();
	}
	
	if (this.controller.stageController.setWindowOrientation)
	{
    	this.controller.stageController.setWindowOrientation("free");
	}
	
	this.alreadyActivated = true;
}

GetLogAssistant.prototype.deactivate = function(event) {}
GetLogAssistant.prototype.cleanup = function(event) {}
