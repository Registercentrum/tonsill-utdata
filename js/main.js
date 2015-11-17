var TonsillWidget = {
	init: function(config) {
		Ext.apply(this.config, config);
		var conf = this.config;
		this._initComponents();
		this.loadUnitData(conf.unit);
	},
	config: {},
	onUnitChange: function() {

	},
	onTEorTTChange: function() {
		TonsillWidget.loadUnitData();
	},
	loadUnitData: function(unit) {
		TonsillWidget.toggleLoading(true);
		TonsillWidget._loadData({
			unit: unit || TonsillWidget._unitCombo.getValue(),
			TT: Ext.getCmp('cb-tt').getValue(),
			TE: Ext.getCmp('cb-te').getValue()
		}, function(success, data) {
			if (success) {
				TonsillWidget.config.mainStore.loadData(data);
			} else {
				Ext.Msg.alert('Fel', 'Något blev fel när data skulle laddas från statistik-servern, var god försök igen');
			}
			TonsillWidget.toggleLoading(false);
		});
	},
	toggleLoading: function(isLoading) {
		var chart = TonsillWidget._chart;
		if (chart) {
			chart.setLoading(isLoading && 'Laddar');
		}
	},
	_loadData: function(conf, cb, data) {
		Ext.Ajax.request({
			type: 'ajax',
			method: 'get',
			url: 'https://stratum.registercentrum.se/api/statistics/ton/aggregates',
			params: {
				apiKey: TonsillWidget.config.apiKey,
				unit: conf.unit
			},
			success: function(resp, opts) {
				var _data = Ext.decode(resp.responseText);
				var retData = data || {};
				var unit = conf.unit;
				Ext.Array.each(objectToArray(_data.data)[0].value, function(i) {
					retData[i.key] = retData[i.key] || {};
					retData[i.key]['year'] = i.key;
					retData[i.key]['cTotal' + (unit == 0 ? 'R' : '')] = i.value[0].value;
					retData[i.key]['cBleed' + (unit == 0 ? 'R' : '')] = (conf.TT ? i.value[1].value : 0) + (conf.TE ? i.value[2].value : 0);
					retData[i.key]['sBleed' + (unit == 0 ? 'R' : '')] = !conf.TT && !conf.TE ? 0 : i.value[TonsillWidget.getTTorTEValue(conf)].value * 100;
					retData[i.key]['ciBleed' + (unit == 0 ? 'R' : '')] = !conf.TT && !conf.TE ? 0 : i.value[TonsillWidget.getTTorTEValue(conf) + 3].value * 100;;
					retData[i.key]['method'] = !conf.TE && !conf.TT ? '' : conf.TE ? (conf.TT ? 'TE+TT' : 'TE') : 'TT';
				});
				if (unit !== 0) {
					conf.unit = 0;
					TonsillWidget._loadData(conf, cb, retData);
				} else {
					cb(true, Ext.Object.getValues(retData));
				}
			},
			failure: function() {
				cb(false);
			}
		});
	},
	// 0: "cTotal"
	// 1: "cBldTE"
	// 2: "cBldTT"
	// 3: "sBleed"
	// 4: "sBldTT"
	// 5: "sBldTE"
	// 6: "ciBleed"
	// 7: "ciBldTT"
	// 8: "ciBldTE"
	getTTorTEValue: function(conf) {
		return conf.TT ? (conf.TE ? 3 : 4) : 5;
	},
	getErrorPathAttributes: function(barSprite, barConfig, deviation, lineConf) {
		var conf = Ext.isObject(lineConf) ? lineConf : {},
			errorWidth = (conf.errorWidth || 20) / 2,
			lineWidth = (conf.lineWidth || 2) / 2,
			barX = barConfig.x + barConfig.width / 2,
			barY = barConfig.y,
			maxHeight = barSprite.attr.innerHeight;
		return {
			path: [
				'M', barX, barY,
				'V', Math.min(maxHeight - lineWidth, barY + deviation - lineWidth), //Line to top bar
				'M', barX - errorWidth, Math.min(maxHeight - lineWidth, barY + deviation - lineWidth),
				'H', errorWidth + barX, //Top error bar
				'M', barX, barY,
				'V', Math.max(barY - deviation + lineWidth, lineWidth),
				'M', barX - errorWidth, Math.max(barY - deviation + lineWidth, lineWidth),
				'H', errorWidth + barX // Bottom error bar
			],
			stroke: conf.stroke || '#000',
			lineWidth: conf.lineWidth || 2,
			zIndex: conf.zIndex || 10000
		};
	},
	errorChartRenderer: function(sprite, config, rendererData, index) {
		var me = TonsillWidget,
			store = rendererData.store,
			storeItems = store.getData().items,
			last = storeItems.length - 1,
			record = storeItems[index],
			surface = sprite.getParent(),
			errorSprites = surface.myErrorSprites,
			scale = sprite.attr.scalingY,
			exactIndex = index + sprite._field,
			isRiket = (/^sBleedR$/).test(sprite._field),
			deviation, errorSprite, i, isLast, retObject;

		isLast = index === rendererData.store.count() - 1;
		retObject = {
			fillOpacity: isLast ? 0.5 : 1,
			strokeOpacity: isLast ? 0 : 1,
		};
		if (!record || !Ext.getCmp('cb-ci').getValue()) {
			// Hides all sprites if there are no records... And adds a text sprite
			if (errorSprites && !surface.mySpritesHidden) {
				Ext.each(errorSprites, function(es) {
					es.hide();
				});
				// surface.mySpritesHidden = true;
			}
			return retObject;
		}
		surface.mySpritesHidden = false;

		deviation = record.get(isRiket ? 'ciBleedR' : 'ciBleed') * scale;

		if (!errorSprites) {
			errorSprites = surface.myErrorSprites = [];
		}
		errorSprite = errorSprites[exactIndex];
		if (!errorSprite) {
			errorSprite = errorSprites[exactIndex] = surface.add({
				type: 'path'
			});
		} else {
			errorSprite.show();
		}
		errorSprite.setAttributes(me.getErrorPathAttributes(sprite, config, deviation, {
			lineWidth: 1,
			stroke: '#58585a'
		}));
		if (index === last) {
			for (i = last + 1; i < errorSprites.length; i++) {
				errorSprites[i].hide();
			}
		}
		return retObject;
		//Adjust width
		// return {
		// width: config.width / 1.25,
		// x: config.x + (config.width - config.width / 1.25) / 2
		// };
	},
	_initComponents: function() {
		var chart, indicatorCombo, unitCombo, mainStore, ct, combosCt, legend;
		var conf = TonsillWidget.config;
		ct = Ext.create('Ext.container.Container', {
			// xtype: 'container',
			layout: 'fit',
			// width: '640',
			renderTo: 'widget'
		});
		combosCt = Ext.create('Ext.container.Container', {
			layout: 'hbox',
			defaults: {
				margin: '0 10px 4px 0',
				// componentCls: 'standard-combo'
			},
			margin: '0 0 39px 0'
		});
		legend = Ext.create('Ext.chart.Legend', {
			flex: 1,
		});

		unitCombo = TonsillWidget._unitCombo = Ext.create({
			xtype: 'combo',
			// componentCls: 'ton-combo-standard',
			// cls: 'ton-combo-cls',
			// triggerWrapCls: 'ton-combo-trigger',
			width: 270,
			store: {
				fields: ['UnitCode', 'UnitName'],
				autoLoad: true,
				proxy: {
					type: 'ajax',
					url: 'https://stratum.registercentrum.se/api/metadata/units/register/129/?apikey=' + TonsillWidget.config.apiKey,
					reader: {
						type: 'json',
						rootProperty: 'data'
					}
				},
				sorters: ['UnitName']
			},
			listeners: {
				select: function(cb, records) {
					var me = this,
						unitId;
					if (!records) {
						return;
					}
					unitId = Ext.isArray(records) ? records[0].get('UnitCode') : records.get('UnitCode');
					if (unitId) {
						TonsillWidget.loadUnitData(unitId);
					}
				},
				focus: function(cb) {
					// cb.clearValue();
					cb.selectText();
					if (!cb.isExpanded) {
						cb.expand();
					}
				}
			},
			value: conf.unit,
			displayField: 'UnitName',
			valueField: 'UnitCode',
			// editable: true,
			typeAhead: true,
			anyMatch: true,
			forceSelection: true,
			queryMode: 'local',
			sendEmptyText: false
		});
		indicatorCombo = Ext.create({
			xtype: 'combo',
			flex: 1,
			store: {
				fields: ['value', 'display'],
				data: [{
					value: 'bleed',
					display: 'Återinlagd på sjukhus p.g.a blödning'
				}]
			},
			valueField: 'value',
			displayField: 'display',
			value: 'bleed'
		});
		mainStore = conf.mainStore = window.mainStore = Ext.create('Ext.data.Store', {
			fields: ['year', 'cBleed', {
				name: 'sBleed',
				defaultValue: 0
			}, 'cBleedR', 'sBleedR', 'method', 'ciBleed', 'ciBleedR'],
			listeners: {
				refresh: function() {
					var cb;
					try {
						cb = TonsillWidget._unitCombo;
						chart.getSeries()[0].setTitle(['Riket', cb.getRawValue()]);
						chart.refreshLegendStore();
					} catch (e) {

					}
				}
			}
		});
		chart = TonsillWidget._chart = Ext.create({
			xtype: 'cartesian',
			// renderTo: 'widget',
			width: 600,
			height: 400,
			store: mainStore,
			stacked: false,
			colors: ['#359aa3', '#f87c16'],
			innerPadding: {
				top: 0,
				left: 16,
				right: 16,
				bottom: 0
			},
			axes: [{
				type: 'numeric',
				position: 'left',
				fields: ['sBleedR', 'sBleed'],
				maximum: 25,
				minimum: 0,
				majorTickSteps: 5,
				label: {
					fontSize: 10,
					color: '#333'
				},
				renderer: function(v) {
					return Ext.util.Format.number(v, '0%');
				},
				style: {
					font: '10px',
					strokeStyle: 'none'
				},
				grid: {
					stroke: '#d8d8d8'
				}
			}, {
				type: 'category',
				position: 'bottom',
				label: {
					fontSize: 10,
					color: '#333'
				},
				style: {
					strokeStyle: '#d8d8d8',
					majorTickSize: 0,
					lineWidth: 0
				},
				fields: ['year']
			}],
			legend: legend,
			series: [{
					type: 'bar',
					xField: 'year',
					yField: ['sBleedR', 'sBleed'],
					title: ['Riket', 'Ej vald'],
					stacked: false,
					useDarkerStrokeColor: false,
					label: {
						display: 'outside',
						field: ['sBleed', 'sBleedR'],
						orientation: 'horizontal',
						fontSize: 10,
						color: '#333',
						calloutColor: 'rgba(0,0,0,0)', // to make it disappear or
						style: {},
						renderer: Ext.util.Format.numberRenderer('0.0%')
					},
					tooltip: {
						anchor: 'top',
						renderer: function(storeItem, item) {
							var isRiket = (/^sBleedR$/).test(item.field);
							this.setHtml(Ext.String.format(
								'Andel: {0}<br>Totalt: {1} operationer<br>Operationsteknik: {2}<br>Täckningsgrad: {3}',
								Ext.util.Format.number(storeItem.get(isRiket ? 'sBleedR' : 'sBleed'), '0.0%'),
								storeItem.get(isRiket ? 'cTotalR' : 'cTotal'),
								storeItem.get('method')));
						}
					},
					renderer: TonsillWidget.errorChartRenderer
				}
				/*, {
								type: 'bar',
								xField: 'year',
								yField: ['sBleed', 'sBleedR'],
								stacked: false,
								style: {
									fillOpacity: 0.7
								}
							}*/
			]
		});
		filterCt = Ext.create('Ext.container.Container', {
			layout: 'hbox',
			// layout: {type: 'hbox', align: 'stretch', pack: 'end'},
			margin: '0 0 19px 0',
			id: 'filterCt',
			items: [legend, {
				xtype: 'fieldcontainer',
				layout: {
					type: 'hbox',
					align: 'stretch',
					pack: 'end'
				},
				// fieldLabel: 'Toppings',
				// pack: 'end',
				defaultType: 'checkboxfield',
				defaults: {
					margin: '0 0 0 4px'
				},
				items: [{
					boxLabel: 'TT',
					name: 'tt',
					inputValue: '1',
					checked: true,
					listeners: {
						change: TonsillWidget.onTEorTTChange
					},
					id: 'cb-tt'
				}, {
					boxLabel: 'TE',
					name: 'topping',
					inputValue: '2',
					checked: true,
					listeners: {
						change: TonsillWidget.onTEorTTChange
					},
					id: 'cb-te'
				}, {
					boxLabel: 'Konfidensintervall 95%',
					name: 'ci',
					inputValue: '3',
					id: 'cb-ci'
				}]
			}]
		});
		combosCt.add([unitCombo, indicatorCombo]);
		ct.add([combosCt, Ext.create('Ext.container.Container', {
			layout: 'fit',
			html: '<img id="tabs-mock" src="images/tabsmockup.png">'
		}), filterCt, chart])
	},

}

Ext.onReady(function() {
	TonsillWidget.init({
		apiKey: 'J6b-GSKrkfk=',
		unit: 10001
	});
});