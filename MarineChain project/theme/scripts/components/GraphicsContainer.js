define([
    'react',
    'lodash',
    'game-logic/clib',
    'components/GraphicDisplay',
    'game-logic/engine',
    'stores/ChartStore',
    'stores/GameSettingsStore'
], function(
    React,
    _,
    Clib,
    GraphicDisplayClass,
    Engine,
    ChartStore,
    GameSettingsStore
){

    var D = React.DOM;

    var GraphicDisplay = new GraphicDisplayClass();

    function getState(){
        return _.merge({}, ChartStore.getState(), GameSettingsStore.getState());
    }

    function getEngineState(){
        return Engine;
    }

    return React.createClass({
        displayName: 'Chart',

        propTypes: {
            isMobileOrSmall: React.PropTypes.bool.isRequired,
            controlsSize: React.PropTypes.string.isRequired
        },

        getInitialState: function () {
            var state = getState();
            state.engine = getEngineState();
            state.nyan = false;
            return state;
        },

        getThisElementNode: function() {
            return this.getDOMNode();
        },

        componentDidMount: function() {
            Engine.on({
                game_started: this._onChange,
                game_crash: this._onChange,
                game_starting: this._onChange,
                lag_change: this._onChange,
                nyan_cat_animation: this._onNyanAnim
            });
            GameSettingsStore.addChangeListener(this._onChange);

            if(this.state.graphMode === 'graphics')
                GraphicDisplay.startRendering();
        },

        componentWillUnmount: function() {
            Engine.off({
                game_started: this._onChange,
                game_crash: this._onChange,
                game_starting: this._onChange,
                lag_change: this._onChange,
                nyan_cat_animation: this._onNyanAnim
            });
            GameSettingsStore.removeChangeListener(this._onChange);

            if(this.state.graphMode === 'graphics')
                GraphicDisplay.stopRendering();
        },

        _onChange: function() {
            if(this.state.nyan === true && Engine.gameState !== 'IN_PROGRESS')
                this.setState({ nyan: false });

            var state = getState();
            state.engine = getEngineState();


            if(this.state.graphMode !== state.graphMode) {
                if(this.state.graphMode === 'text')
                    GraphicDisplay.startRendering();
                else
                    GraphicDisplay.stopRendering();
            }

            if(this.isMounted())
                this.setState(state);
        },

        componentDidUpdate: function(prevProps, prevState) {
            //Detect changes on the controls size to trigger a window resize to resize the canvas of the graphics display
              if(this.state.graphMode === 'graphics' &&  this.state.controlsSize !== prevState.controlsSize)
                    GraphicDisplay.onWindowResize();
        },

        _onNyanAnim: function() {
            this.setState({ nyan: true });
        },

        render: function() {
            var self = this;

            var languageCode = document.getElementById('id_hiddenLanguageCode').value;
            var languageFlag = (languageCode == 'en') ? true : false;

            return  D.div({ className : "row"},
                        D.div({className : 'col-md-12'},
                            D.div({id : 'id_divChart'})
                        ),
                        D.div({ className : 'btn-circle-50p crash_point_div', id : 'id_divPayout' }, '12.38x'),
                        D.div({ className : 'class_divRoundNote', id : 'id_divRoundNote' }, 'Next Round\nin 2.45'),
                        D.div({ id : 'id_advertisementContainer_before'}),
                        D.div({id:'id_advertisementContainer'},
                            D.img({id: 'id_imageAdvertisement', src:'/img/advertisement.jpg', style : {width:"100%", height:"100%"}})
                        ),
                        D.div({ className: 'max-profit' },
                            (languageFlag ? 'Max profit: ' : 'Max profit_zh'), (Engine.maxWin/1e8).toFixed(4), ' BTC'
                        )
                    );
        }
    });
});
