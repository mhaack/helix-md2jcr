Some Tests With Tables

<table>
  <tr>
    <td>Header Cell 1</td>
    <td>Header 2</td>
    <td>Header 4</td>
  </tr>
  <tr>
    <td><h3>Heading</h3></td>
    <td><ul> <li>List</li> <li>Items</li> <li>In</li> <li>table</li> </ul></td>
    <td><h4>Mixed</h4><p>Content.</p><pre><code>const a = 1;<br>console.log(a);<br></code></pre></td>
  </tr>
  <tr>
    <td><p>The ultimate: table in tables:</p><p></p><table> <thead> <tr> <th><p>Key</p></th> <th><p>Value</p></th> </tr> </thead> <tbody> <tr> <td><p>Emmet</p></td> <td><p>King of Lego</p></td> </tr> </tbody> </table><p><br> <br> </p></td>
    <td><h2>Parrots!</h2><p><img src="https://hlx.blob.core.windows.net/external/19c0cf25413106c81920d75078ee2ef30a55d52e7#image.jpeg?width=365&#x26;height=351" alt=""></p></td>
    <td><p>Total <strong>normal</strong> test with some <em>minimal</em> formatting.</p><p>And <code>just </code>a new line.</p><p>And <a href="https://www.adobe.com/">Link</a>.</p></td>
  </tr>
  <tr>
    <td><p>What about sections?</p><hr><p>Would this be on a new one?</p></td>
    <td></td>
    <td></td>
  </tr>
</table>

# And some consecutive tables

<table>
  <tr>
    <td>Key</td>
    <td>Value</td>
  </tr>
  <tr>
    <td>A</td>
    <td>42</td>
  </tr>
  <tr>
    <td>B</td>
    <td>99</td>
  </tr>
</table>

<table>
  <tr>
    <td>Name</td>
    <td>Value</td>
  </tr>
  <tr>
    <td>TAU</td>
    <td>6.282</td>
  </tr>
  <tr>
    <td>PI</td>
    <td>3.141</td>
  </tr>
</table>

# With Column Formatting

<table>
  <tr>
    <td>Left</td>
    <td align="center">Center</td>
    <td align="right">Right</td>
  </tr>
  <tr>
    <td>Switzerland</td>
    <td align="center">Cheese</td>
    <td align="right">23.9</td>
  </tr>
  <tr>
    <td>Germany</td>
    <td align="center">Wurst</td>
    <td align="right">44.2</td>
  </tr>
</table>

# Row- and colspan

<table>
  <tr>
    <td colspan="2">AB1</td>
    <td>C1</td>
    <td>D1</td>
  </tr>
  <tr>
    <td>A2</td>
    <td>B2</td>
    <td>C2</td>
  </tr>
  <tr>
    <td rowspan="4">A3456</td>
    <td>B3</td>
    <td colspan="2">CD3</td>
  </tr>
  <tr>
    <td colspan="2" rowspan="2">BC45</td>
  </tr>
  <tr>
    <td rowspan="2">D56</td>
  </tr>
  <tr>
    <td>B6</td>
    <td>C6</td>
  </tr>
  <tr>
    <td>A7</td>
    <td>B7</td>
  </tr>
</table>
