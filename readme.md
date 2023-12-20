#Product-image Controller

retrieves all documents marked as article / foto from any desired company

base url: /product-images/${company}/${productId}
prefered url: /product-images/${guid}

It is only possible to use the guid base url if the image guid is available otherwise use the base url method using company and product id.


File structure in content folder
--------------------------------
* /content
  * /00 (first 2 characters of file guid)
    * /0a7c840-8c12-466a-afb1-7336b4244f59
      * /file
      * /thumb (120x120 contain image)
      * /thumb_etag
      * /thumb_large (280x280 containe image)
      * /thumb_large_etag
      * /miniature (380x380 cover image)
      * /miniature_etag
* /thumbs

Proposed new file structure
--------------------------------
* /content
  * /00 (first 2 characters of file guid)
    * /59 (last 2 characters of file guid)
      * /0a7c840-8c12-466a-afb1-7336b4244f59
        * /file
        * /file_etag
        * /image_small (72x72 contain image)
        * /image_small_etag
        * /thumb (120x120 contain image)
        * /thumb_etag
        * /thumb_m (180x180 contain image)
        * /thumb_m_etag
        * /thumb_l (240x240 contain image)
        * /thumb_l_etag
        * /thumb_large (280x280 contain image)
        * /thumb_large_etag
        * /miniature (380x380 cover image)
        * /miniature_etag
        * /image (800x800 contain image)
        * /image_etag
        * /image_large (2048x2048 contain image)
        * /image_large_etag
        * /fsinfo
        * /exif
        * /color_code (hex rgb color string)
        * /mime-type
        * /passcode