function openEvent(strname){

    var i,x,y;
    
    x=document.getElementsByClassName("tab-content");
        for(i=0;i<x.length;i++){
        x[i].style.display='none';
        
        }
        y=document.getElementsByClassName("tab-links");
        for(i=0;i<y.length;i++){
        y[i].className=y[i].className.replace("  active","");
        
        }
        document.getElementById(strname).style.display="block";
         
        
    };