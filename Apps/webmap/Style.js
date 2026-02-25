
/*******************************************************************************
 * Style *
 * 
 * En esta seccion se almacenan todos los estilos que se usaran. 
 * 
 * Guidelines: .
 ******************************************************************************/

var styles = {
  opacityWhiteMed: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)'
  },
  
  opacityWhiteNone : {
    backgroundColor: 'rgba(255, 255, 255, 0)'
  },
  
  aboutText : {
    fontSize: '13px',
    color: '505050'
  },
  widgetTitle : {
    fontSize: '15px',
    fontWeight: 'bold',
    margin: '8px 8px 0px 8px',
    color: '383838'
  },
  stretchHorizontal : {
    stretch: 'horizontal'
  },
  noTopMargin : {
    margin: '0px 8px 8px 8px'
  },
  smallBottomMargin : {
    margin: '8px 8px 4px 8px'
  },
  bigTopMargin : {
    margin: '24px 8px 8px 8px'
  },
  
  divider : {
    backgroundColor: 'F0F0F0',
    height: '4px',
    margin: '20px 0px'
  },
  
  visParams_region : {
    color: 'black',          
    fillColor: 'FF000000',
    width: 3               
  },
  
  infoTable2 : {
    border: '5px solid black',
    width: '250px',
    padding: '8px',
    shown: false
  },
  infoTable: {
    border: '1px solid black',
    stretch: 'horizontal',
    fontSize: '4px',
    shown:false
  },
//diccionario con estilo de label desactivada, se busca transparencia. Sera el estilo inicial.
  disableLabel : {
    backgroundColor: 'white',  // blanco como el fondo del controlPanel.
    padding: '10px 15px',  
    border: 'none',
    color: 'white',  
    textAlign: 'center',  
    fontSize: '13px',  
    margin: '10px'
  },

  ableLabel : {
    stretch: 'horizontal',
    backgroundColor: '#f3f3f3',  // color gris igual al de los selectores.
    padding: '5px',  
    border: '1px solid lightgrey',//#dcdcd 
    color: 'black',  
    textAlign: 'center',  
    fontSize: '13px',  
    margin: '10px' 
  },
  SensoresStyle : {
    color: 'red',
    pointShape: 'circle',
    pointSize: 20   
  },
  labelTabla1 : {
    padding: '1px', 
    backgroundColor: 'white',
    margin: '0px',
    border: '1px solid black',
    width: '190px'
  },
    labelTabla2 : {
    padding: '1px', 
    backgroundColor: '#D3D3D3',
    margin: '0px',
    border: '1px solid black',
    width: '190px'
    },
    
    buttonStyle :{
      margin: '0px 0px 2px 0px',
      fontSize: '6px',
      padding: '0px',
    },
    
    legendColorbar: {
      stretch: 'horizontal',
  margin: '0px 8px',
  maxHeight: '20px'
  },
  legendCenterLabel: {
    margin: '4px 8px',
  fontSize: '12px',
  textAlign: 'center',
  stretch: 'horizontal'
  },
    legendLabel: {
    margin: '4px 8px',
  fontSize: '12px',
  }, 
  legendTitle: {
  fontWeight: 'bold',
  fontSize: '12px',
  color: '383838'
  }, 
  legendPanel: {
  position: 'bottom-left',
  width: '210px',
  padding: '0px', 
  shown: false
  },
  styleChartAxis : {
    italic: false,
    bold: true
  },
  styleChartArea : {
    width: '600px',
    height: '450px', // Valor para asegurar que se vea la fecha completa
    margin: '0px',
    padding: '0px'
  }
};
  
  
exports.styles = styles;

/*


*/