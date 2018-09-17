function changeToUpper(id) {
    document.getElementById(id).value = document.getElementById(id).value.toUpperCase();
}

function deleteCookies(){
    //console.log(document.cookie);
    let time = new Date();
    time.setHours(time.getHours()-13);
    document.cookie = "jsontoken='';Expires="+time.toUTCString()+';';
    //console.log(document.cookie);
}

//$("#button").click(
function clickMe(){
        const data = $('#query').val();
        $.post('/myQuery', {'query': data}, ()=>{
            const basicV = "<div class='row'><div class='col-7'></div><div class='alert alert-warning col-5 align-self-end rounded'>";
            $('#chatPlace').append(basicV + data + "</div></div>");
            //$('#chats').html(data);
            $('#query').val(' ');
        })
            .done((response)=>{
                console.log(response);
                const htmlTag = "<div class='row'> <div class='alert alert-success col-5 align-self-start rounded'>";
                $('#chatPlace').append(htmlTag + response.data + "</div></div>");
                //$('#response').html(response.data.data);
            })
            .fail((response)=>{
                const htmlTags = "<div class='row'> <div class='alert alert-danger col-5 align-self-start rounded'>";
                $('#chatPlace').append(htmlTags + "Something happened wrong please try again" + "</div></div>");
                //$('#response').html("Something happening wrong<br>Check your connection");
            })
}//);