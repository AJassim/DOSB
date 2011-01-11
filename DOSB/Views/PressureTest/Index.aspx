﻿<%@ Page Title="" Language="C#" MasterPageFile="~/Views/Shared/Site.Master" Inherits="System.Web.Mvc.ViewPage<IEnumerable<DOSB.Models.PressureTest>>" %>

<asp:Content ID="Content1" ContentPlaceHolderID="TitleContent" runat="server">
	Pressure Test Log
</asp:Content>

<asp:Content ID="Content2" ContentPlaceHolderID="MainContent" runat="server">

    <h2>Pressure Test Log</h2>

    
    <p>
         <img src="/Content/Images/icon_plus.gif"/>
         <%: Html.ActionLink("New", "Create") %>
    </p>
    <table>
        <tr>
            <th>
                Sequence Number
            </th>
            <th>
                Part Number
            </th>
            <th>
                Serial Number
            </th>
            <th>
                Memo
            </th>
            <th>
                Test By
            </th>
            <th>
                Start Time
            </th>
            <th>
                End Time
            </th>
            <th>
                Defect
            </th>
        </tr>

    <% foreach (var item in Model) { %>
    
        <tr>
            <td>
                <%: item.PressureTestId %>
            </td>
            <td>
                <%: item.PartNumber %>
            </td>
            <td>
                <%: item.SerialNumber %>
            </td>
            <td>
                <%: item.Memo %>
            </td>
            <td>
                <%: item.Employee.GivenName + " " + item.Employee.SurName%>
            </td>
            <td>
                <%: String.Format("{0:g}", item.StartAt) %>
            </td>
            <td>
                <%: String.Format("{0:g}", item.FinishAt) %>
            </td>
            <td>
                <%: item.Defect %>
            </td>
        </tr>
    
    <% } %>

    </table>


</asp:Content>

<asp:Content ID="Content3" ContentPlaceHolderID="ScriptContent" runat="server">
</asp:Content>
